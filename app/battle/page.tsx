'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { track } from '@/lib/telemetry';
import type { BattleWriteback } from '@/lib/game/types';

type Side = 'player' | 'ai';

type Troop = {
  id: string;
  name: string;
  hp: number;
  atk: number;
  speed: number;
  range: number;
  cdMs: number;
};

type Unit = {
  uid: string;
  owner: Side;
  troopId: string;
  lane: number;
  x: number;
  hp: number;
  atk: number;
  speed: number;
  range: number;
  cooldown: number;
};

const TROOPS: Troop[] = [
  { id: 'infantry', name: '步兵', hp: 120, atk: 16, speed: 10, range: 4, cdMs: 2200 },
  { id: 'spear', name: '枪兵', hp: 95, atk: 19, speed: 11, range: 5, cdMs: 2600 },
  { id: 'cavalry', name: '骑兵', hp: 150, atk: 22, speed: 14, range: 5, cdMs: 3600 },
  { id: 'archer', name: '弓兵', hp: 75, atk: 18, speed: 8, range: 12, cdMs: 3000 }
];

function makeUnit(troop: Troop, owner: Side, lane: number): Unit {
  return {
    uid: `${owner}-${troop.id}-${Math.random().toString(36).slice(2, 8)}`,
    owner,
    troopId: troop.id,
    lane,
    x: owner === 'player' ? 18 : 82,
    hp: troop.hp,
    atk: troop.atk,
    speed: troop.speed,
    range: troop.range,
    cooldown: 0
  };
}

export default function BattlePage() {
  const [fromCampaign, setFromCampaign] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [running, setRunning] = useState(true);
  const [aiPersona] = useState<'aggressive' | 'balanced' | 'defensive'>(() => {
    const personas: Array<'aggressive' | 'balanced' | 'defensive'> = ['aggressive', 'balanced', 'defensive'];
    return personas[Math.floor(Math.random() * personas.length)];
  });
  const [aiLogs, setAiLogs] = useState<string[]>([]);

  const [playerTowers, setPlayerTowers] = useState([900, 900, 900]);
  const [aiTowers, setAiTowers] = useState([900, 900, 900]);
  const [playerCore, setPlayerCore] = useState(1800);
  const [aiCore, setAiCore] = useState(1800);

  const [playerTroopCd, setPlayerTroopCd] = useState<Record<string, number>>({});
  const [aiTroopCd, setAiTroopCd] = useState<Record<string, number>>({});

  const aiThink = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFromCampaign(new URLSearchParams(window.location.search).get('from') === 'campaign');
    }
  }, []);

  const deploy = useCallback((owner: Side, troop: Troop, lane: number) => {
    if (!running) return;
    if (owner === 'player') {
      const left = playerTroopCd[troop.id] ?? 0;
      if (left > 0) return;
      setPlayerTroopCd((s) => ({ ...s, [troop.id]: troop.cdMs }));
    } else {
      const left = aiTroopCd[troop.id] ?? 0;
      if (left > 0) return;
      setAiTroopCd((s) => ({ ...s, [troop.id]: troop.cdMs }));
    }
    setUnits((prev) => [...prev, makeUnit(troop, owner, lane)]);
    track({ name: owner === 'player' ? 'battle_deploy' : 'battle_ai_deploy', at: Date.now(), props: { troop: troop.id, lane } });
  }, [running, playerTroopCd, aiTroopCd]);

  useEffect(() => {
    if (!running) return;
    const dt = 0.1;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        const nt = Math.max(0, t - dt);
        if (nt <= 0) setRunning(false);
        return nt;
      });

      setPlayerTroopCd((prev) => {
        const next: Record<string, number> = {};
        for (const t of TROOPS) next[t.id] = Math.max(0, (prev[t.id] ?? 0) - dt * 1000);
        return next;
      });
      setAiTroopCd((prev) => {
        const next: Record<string, number> = {};
        for (const t of TROOPS) next[t.id] = Math.max(0, (prev[t.id] ?? 0) - dt * 1000);
        return next;
      });

      aiThink.current += dt;
      if (aiThink.current >= 1.2) {
        aiThink.current = 0;
        const pressure = [0, 1, 2].map((lane) => units.filter((u) => u.owner === 'player' && u.lane === lane).reduce((acc, u) => acc + u.hp, 0));
        const laneMax = pressure.indexOf(Math.max(...pressure));
        const laneMin = pressure.indexOf(Math.min(...pressure));
        const lane = aiPersona === 'aggressive' ? laneMin : aiPersona === 'defensive' ? laneMax : Math.random() < 0.6 ? laneMax : laneMin;
        const candidate = TROOPS
          .filter((t) => (aiTroopCd[t.id] ?? 0) <= 0)
          .sort((a, b) => (aiPersona === 'aggressive' ? b.atk - a.atk : aiPersona === 'defensive' ? b.hp - a.hp : b.atk + b.hp * 0.2 - (a.atk + a.hp * 0.2)))[0];
        if (candidate) {
          deploy('ai', candidate, lane);
          setAiLogs((prev) => [`AI(${aiPersona})：投放 ${candidate.name} 到 ${lane + 1} 路`, ...prev].slice(0, 6));
        }
      }

      setUnits((prevUnits) => {
        const next = prevUnits.map((u) => ({ ...u, cooldown: Math.max(0, u.cooldown - dt) }));
        const pT = [...playerTowers];
        const aT = [...aiTowers];
        let pCore = playerCore;
        let aCore = aiCore;

        for (const unit of next) {
          const enemies = next.filter((x) => x.owner !== unit.owner && x.lane === unit.lane && x.hp > 0);
          const nearest = enemies.sort((a, b) => Math.abs(a.x - unit.x) - Math.abs(b.x - unit.x))[0];

          if (nearest && Math.abs(nearest.x - unit.x) <= unit.range) {
            if (unit.cooldown <= 0) {
              nearest.hp -= unit.atk;
              unit.cooldown = 0.8;
            }
            continue;
          }

          const targetTower = unit.owner === 'player' ? aT : pT;
          const towerX = unit.owner === 'player' ? 88 : 12;
          if (targetTower[unit.lane] > 0 && Math.abs(unit.x - towerX) <= unit.range) {
            if (unit.cooldown <= 0) {
              targetTower[unit.lane] -= unit.atk;
              unit.cooldown = 0.8;
            }
            continue;
          }

          const coreX = unit.owner === 'player' ? 96 : 4;
          if (Math.abs(unit.x - coreX) <= unit.range) {
            if (unit.cooldown <= 0) {
              if (unit.owner === 'player') aCore -= unit.atk;
              else pCore -= unit.atk;
              unit.cooldown = 0.8;
            }
            continue;
          }

          unit.x += (unit.owner === 'player' ? 1 : -1) * unit.speed * dt;
        }

        const towerShoot = (owner: Side, lane: number, towerHp: number) => {
          if (towerHp <= 0) return;
          const x = owner === 'player' ? 12 : 88;
          const enemies = next.filter((u) => u.owner !== owner && u.lane === lane && Math.abs(u.x - x) <= 18 && u.hp > 0);
          if (enemies.length > 0) enemies[0].hp -= 16;
        };

        [0, 1, 2].forEach((lane) => {
          towerShoot('player', lane, pT[lane]);
          towerShoot('ai', lane, aT[lane]);
          pT[lane] = Math.max(0, pT[lane]);
          aT[lane] = Math.max(0, aT[lane]);
        });

        pCore = Math.max(0, pCore);
        aCore = Math.max(0, aCore);
        setPlayerTowers(pT as [number, number, number]);
        setAiTowers(aT as [number, number, number]);
        setPlayerCore(pCore);
        setAiCore(aCore);

        if (pCore <= 0 || aCore <= 0) setRunning(false);

        return next.filter((u) => u.hp > 0 && u.x >= 0 && u.x <= 100);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [running, units, aiPersona, playerTroopCd, aiTroopCd, aiTowers, playerTowers, playerCore, aiCore, deploy]);

  const result = useMemo(() => {
    if (running) return '';
    if (playerCore <= 0 && aiCore <= 0) return '平局';
    if (aiCore <= 0) return '你胜利（天下布武推进）';
    if (playerCore <= 0) return '你战败（需调整策略）';
    return playerCore > aiCore ? '时间结束：你占优' : playerCore < aiCore ? '时间结束：AI 占优' : '时间结束：平局';
  }, [running, playerCore, aiCore]);

  useEffect(() => {
    if (running) return;
    const winner: BattleWriteback['winner'] = aiCore <= 0 ? 'player' : playerCore <= 0 ? 'ai' : playerCore === aiCore ? 'draw' : playerCore > aiCore ? 'player' : 'ai';
    const report: BattleWriteback = {
      winner,
      playerCoreHp: Math.round(playerCore),
      aiCoreHp: Math.round(aiCore),
      turnsUsed: 120 - Math.ceil(timeLeft)
    };
    localStorage.setItem('sws-battle-report', JSON.stringify(report));
    track({ name: 'battle_result', at: Date.now(), props: { winner, turnsUsed: report.turnsUsed } });
  }, [running, playerCore, aiCore, timeLeft]);

  return (
    <main className="app-shell text-zinc-100">
      <header className="panel flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">TACTICAL BATTLE</p>
          <h1 className="text-xl font-semibold">无卡纯对战模式</h1>
        </div>
        <Link href={fromCampaign ? '/campaign' : '/'} className="text-sm text-cyan-300 hover:underline">
          {fromCampaign ? '返回战役' : '返回首页'}
        </Link>
      </header>

      <section className="panel p-4">
        <div className="mb-3 grid gap-2 text-sm md:grid-cols-4">
          <p>⏱ 剩余：{Math.ceil(timeLeft)}s</p>
          <p>🛡 我方本阵：{Math.round(playerCore)}</p>
          <p>🏴 敌方本阵：{Math.round(aiCore)}</p>
          <p className="font-semibold text-cyan-300">{result || '战斗进行中...'}</p>
        </div>

        <div className="space-y-2">
          {[0, 1, 2].map((lane) => (
            <div key={lane} className="relative h-16 rounded border border-zinc-700 bg-zinc-950/60">
              <div className="absolute left-1 top-1 text-[10px] text-zinc-400">我塔 {Math.round(playerTowers[lane])}</div>
              <div className="absolute right-1 top-1 text-[10px] text-zinc-400">敌塔 {Math.round(aiTowers[lane])}</div>
              {units
                .filter((u) => u.lane === lane)
                .map((u) => (
                  <div
                    key={u.uid}
                    className={`absolute top-7 h-3 w-3 rounded-full ${u.owner === 'player' ? 'bg-cyan-400' : 'bg-rose-400'}`}
                    style={{ left: `calc(${u.x}% - 6px)` }}
                    title={`${u.owner === 'player' ? '我' : '敌'}-${u.troopId}:${Math.round(u.hp)}`}
                  />
                ))}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-400">AI 人格：{aiPersona}</p>
        <div className="mt-1 space-y-1 text-xs text-zinc-400">{aiLogs.map((l, i) => <p key={`${l}-${i}`}>- {l}</p>)}</div>
      </section>

      <section className="panel p-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:pb-4">
        <p className="mb-2 text-sm text-zinc-300">兵种调度（无卡）</p>
        <div className="grid gap-2 md:grid-cols-4">
          {TROOPS.map((t) => {
            const cd = playerTroopCd[t.id] ?? 0;
            const disabled = cd > 0 || !running;
            return (
              <div key={t.id} className="rounded-lg border border-zinc-700 bg-zinc-950/60 p-3">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-zinc-400">CD {Math.ceil(t.cdMs / 1000)}s · HP {t.hp} · ATK {t.atk}</p>
                <p className="mt-1 text-[11px] text-cyan-300">{cd > 0 ? `冷却中 ${Math.ceil(cd / 1000)}s` : '可用'}</p>
                <div className="mt-2 flex gap-1">
                  {[0, 1, 2].map((lane) => (
                    <button
                      key={`${t.id}-${lane}`}
                      onClick={() => deploy('player', t, lane)}
                      disabled={disabled}
                      className="chip-btn px-2 py-1 text-xs"
                    >
                      线{lane + 1}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="fixed inset-x-0 bottom-0 z-20 border-t border-cyan-500/30 bg-zinc-950/90 px-3 py-2 backdrop-blur md:hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
        <p className="mb-1 text-[11px] text-zinc-400">移动端快速调度（步兵）</p>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((lane) => (
            <button
              key={`quick-${lane}`}
              onClick={() => deploy('player', TROOPS[0], lane)}
              className="chip-btn border-cyan-400/60 text-xs"
            >
              线{lane + 1} 快投
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
