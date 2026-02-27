'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { EDGES, REGIONS, frontierEdges, resolveOwnership, type Region } from '@/lib/game/map';
import { unpackSave } from '@/lib/game/save';

function ownerClass(owner: 'player' | 'enemy' | 'neutral') {
  if (owner === 'player') return 'fill-cyan-400 stroke-cyan-300';
  if (owner === 'enemy') return 'fill-rose-400 stroke-rose-300';
  return 'fill-zinc-500 stroke-zinc-300';
}

export default function MapPage() {
  const [selected, setSelected] = useState<Region | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [last, setLast] = useState({ x: 0, y: 0 });

  const owners = useMemo(() => {
    if (typeof window === 'undefined') return resolveOwnership();
    const raw = window.localStorage.getItem('sws-campaign-save:auto');
    const state = raw ? unpackSave(raw) : null;
    return resolveOwnership(state ?? undefined);
  }, []);

  const front = useMemo(() => frontierEdges(owners), [owners]);

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
        </div>

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
          </svg>
        </div>
      </section>

      <section className="panel p-4">
        {!selected ? (
          <p className="text-sm text-zinc-400">点击地图节点查看详情（驻军/治安/资源/威胁）。</p>
        ) : (
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-cyan-300">{selected.name} · {selected.id.toUpperCase()}</p>
            <p>占领：{owners[selected.id] === 'player' ? '我方' : owners[selected.id] === 'enemy' ? '敌方' : '中立'}</p>
            <p>地形：{selected.terrain === 'plain' ? '平原' : selected.terrain === 'mountain' ? '山地' : '水域'}</p>
            <p>标签：{selected.tag === 'capital' ? '主城' : selected.tag === 'fort' ? '要塞' : selected.tag === 'granary' ? '粮仓' : '普通郡'}</p>
            <p>驻军：{selected.terrain === 'mountain' ? 140 : selected.terrain === 'river' ? 110 : 95}</p>
            <p>治安：{owners[selected.id] === 'player' ? 76 : owners[selected.id] === 'enemy' ? 58 : 63}</p>
            <p>资源：{selected.tag === 'granary' ? '粮草高产' : selected.tag === 'capital' ? '税收中枢' : '常规产出'}</p>
            <p>威胁：{owners[selected.id] === 'enemy' ? '高' : owners[selected.id] === 'neutral' ? '中' : '低'}</p>
          </div>
        )}
      </section>
    </main>
  );
}
