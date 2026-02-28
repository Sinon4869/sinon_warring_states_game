'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { EDGES, REGIONS, chooseEnemyMapDecision, createBattleContextFromMap, frontierEdges, hasSupplyLine, resolveOwnership, type Region } from '@/lib/game/map';
import { unpackSave } from '@/lib/game/save';
import { track } from '@/lib/telemetry';

function ownerClass(owner: 'player' | 'enemy' | 'neutral') {
  if (owner === 'player') return 'fill-cyan-400 stroke-cyan-300';
  if (owner === 'enemy') return 'fill-rose-400 stroke-rose-300';
  return 'fill-zinc-500 stroke-zinc-300';
}

export default function MapPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Region | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [last, setLast] = useState({ x: 0, y: 0 });
  const [showFog, setShowFog] = useState(true);
  const [enemyMsg, setEnemyMsg] = useState('');

  const owners = useMemo(() => {
    if (typeof window === 'undefined') return resolveOwnership();
    const raw = window.localStorage.getItem('sws-campaign-save:auto');
    const state = raw ? unpackSave(raw) : null;
    return resolveOwnership(state ?? undefined);
  }, []);

  const front = useMemo(() => frontierEdges(owners), [owners]);

  function runMapAction(action: 'march' | 'attack' | 'resupply') {
    if (!selected) return;
    const owner = owners[selected.id];
    if (owner !== 'player') {
      setActionMsg('仅可对我方控制区域下达行动。');
      return;
    }

    const supplyOk = hasSupplyLine(selected.id, owners);
    const ctx = createBattleContextFromMap(selected, action, supplyOk);
    localStorage.setItem('sws-battle-context', JSON.stringify(ctx));
    track({
      name: 'map_action',
      at: Date.now(),
      props: { contextId: ctx.id, regionId: ctx.regionId, region: selected.name, action, supplyOk }
    });

    const raw = localStorage.getItem('sws-map-actions');
    const logs = raw ? (JSON.parse(raw) as Array<{ at: number; action: string; region: string; supplyOk: boolean }>) : [];
    logs.unshift({ at: Date.now(), action, region: selected.name, supplyOk });
    localStorage.setItem('sws-map-actions', JSON.stringify(logs.slice(0, 80)));

    if (action === 'resupply') {
      setActionMsg(`已执行补给整备：${selected.name}（补给${supplyOk ? '畅通' : '受阻'}）`);
      return;
    }

    router.push('/battle?from=campaign&context=1');
  }

  function runEnemyTurn() {
    const decision = chooseEnemyMapDecision(owners);
    if (!decision) {
      setEnemyMsg('敌军暂无可执行行动。');
      return;
    }
    const text = `敌军行动：${decision.action} -> ${decision.targetRegionName}（${decision.reason}）`;
    setEnemyMsg(text);
    const raw = localStorage.getItem('sws-map-enemy-actions');
    const logs = raw ? (JSON.parse(raw) as Array<{ at: number; action: string; regionId: string; region: string; reason: string }>) : [];
    logs.unshift({ at: Date.now(), action: decision.action, regionId: decision.targetRegionId, region: decision.targetRegionName, reason: decision.reason });
    localStorage.setItem('sws-map-enemy-actions', JSON.stringify(logs.slice(0, 80)));
    track({ name: 'map_enemy_action', at: Date.now(), props: { action: decision.action, regionId: decision.targetRegionId, region: decision.targetRegionName, reason: decision.reason } });
  }

  return (
    <main className="app-shell text-zinc-100">
      <header className="panel flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">WORLD MAP</p>
          <h1 className="panel-title">战役世界地图</h1>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/campaign" className="text-cyan-300 hover:underline">战役</Link>
          <Link href="/" className="text-cyan-300 hover:underline">首页</Link>
        </div>
      </header>

      <section className="panel p-4">
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <button className="chip-btn" onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(2))))}>缩小</button>
          <button className="chip-btn" onClick={() => setScale((s) => Math.min(2.2, Number((s + 0.1).toFixed(2))))}>放大</button>
          <button className="chip-btn" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}>重置视角</button>
          <button className="chip-btn" onClick={() => setShowFog((v) => !v)}>{showFog ? '关闭迷雾' : '开启迷雾'}</button>
          <button className="chip-btn border-rose-500/60" onClick={runEnemyTurn}>敌军回合模拟</button>
        </div>
        {enemyMsg && <p className="mb-2 text-xs text-rose-300">{enemyMsg}</p>}

        <div
          className="relative h-[460px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950/80"
          onPointerDown={(e) => { setDragging(true); setLast({ x: e.clientX, y: e.clientY }); }}
          onPointerMove={(e) => {
            if (!dragging) return;
            const dx = e.clientX - last.x;
            const dy = e.clientY - last.y;
            setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
            setLast({ x: e.clientX, y: e.clientY });
          }}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          <svg viewBox="0 0 420 430" className="h-full w-full" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center center' }}>
            <rect x="0" y="0" width="420" height="430" fill="rgba(8,12,24,0.85)" />

            {REGIONS.map((r) => (
              <g key={`terrain-${r.id}`}>
                <circle cx={r.x} cy={r.y} r={r.terrain === 'mountain' ? 16 : r.terrain === 'river' ? 14 : 12} fill={r.terrain === 'mountain' ? 'rgba(251,191,36,0.16)' : r.terrain === 'river' ? 'rgba(56,189,248,0.18)' : 'rgba(74,222,128,0.14)'} />
              </g>
            ))}

            {EDGES.map((edge) => {
              const a = REGIONS.find((r) => r.id === edge.from);
              const b = REGIONS.find((r) => r.id === edge.to);
              if (!a || !b) return null;
              const isFront = front.some((f) => f.from === edge.from && f.to === edge.to);
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isFront ? '#22d3ee' : '#52525b'}
                  strokeWidth={isFront ? 2.2 : 1.2}
                  strokeDasharray={isFront ? '4 3' : '0'}
                />
              );
            })}

            {REGIONS.map((r) => (
              <g key={r.id} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
                <circle cx={r.x} cy={r.y} r={selected?.id === r.id ? 9 : 7} className={ownerClass(owners[r.id])} strokeWidth={selected?.id === r.id ? 2.5 : 1.5} />
                <text x={r.x + 9} y={r.y - 8} fontSize="10" fill="#d4d4d8">{r.name}</text>
              </g>
            ))}

            {showFog && REGIONS.filter((r) => owners[r.id] !== 'player').map((r) => (
              <circle key={`fog-${r.id}`} cx={r.x} cy={r.y} r={18} fill="rgba(2,6,23,0.35)" stroke="rgba(148,163,184,0.18)" strokeWidth={1} />
            ))}
          </svg>
        </div>
      </section>

      <section className="panel p-4">
        {!selected ? (
          <p className="text-sm text-zinc-400">点击地图节点查看详情（驻军/治安/资源/威胁）。</p>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-cyan-300">{selected.name} · {selected.id.toUpperCase()}</p>
            <p>占领：{owners[selected.id] === 'player' ? '我方' : owners[selected.id] === 'enemy' ? '敌方' : '中立'}</p>
            <p>地形：{selected.terrain === 'plain' ? '平原' : selected.terrain === 'mountain' ? '山地' : '水域'}</p>
            <p>标签：{selected.tag === 'capital' ? '主城' : selected.tag === 'fort' ? '要塞' : selected.tag === 'granary' ? '粮仓' : '普通郡'}</p>
            <p>驻军：{selected.terrain === 'mountain' ? 140 : selected.terrain === 'river' ? 110 : 95}</p>
            <p>治安：{owners[selected.id] === 'player' ? 76 : owners[selected.id] === 'enemy' ? 58 : 63}</p>
            <p>资源：{selected.tag === 'granary' ? '粮草高产' : selected.tag === 'capital' ? '税收中枢' : '常规产出'}</p>
            <p>威胁：{owners[selected.id] === 'enemy' ? '高' : owners[selected.id] === 'neutral' ? '中' : '低'}</p>
            <p>补给线：{owners[selected.id] === 'player' ? (hasSupplyLine(selected.id, owners) ? '畅通' : '受阻') : 'N/A'}</p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button className="chip-btn" onClick={() => runMapAction('march')}>行军推进</button>
              <button className="chip-btn border-rose-500/60" onClick={() => runMapAction('attack')}>发起进攻</button>
              <button className="chip-btn border-emerald-500/60" onClick={() => runMapAction('resupply')}>整备补给</button>
            </div>
            {actionMsg && <p className="text-xs text-cyan-300">{actionMsg}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
