'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { decideAIDeploy, type AIPersona } from '@/lib/game/ai';
import { DEFAULT_BALANCE, parseBalanceConfig, type UnitBalance } from '@/lib/game/balance';
import type { BattleWriteback } from '@/lib/game/types';

type Side = 'player' | 'ai';

type Unit = {
  uid: string;
  owner: Side;
  cardId: string;
  lane: number;
  x: number;
  hp: number;
  atk: number;
  speed: number;
  range: number;
  cooldown: number;
};

export default function BattlePage() {
  const params = useSearchParams();
  const [cards, setCards] = useState<UnitBalance[]>(DEFAULT_BALANCE.units);
  const [units, setUnits] = useState<Unit[]>([]);
  const [playerEnergy, setPlayerEnergy] = useState(5);
  const [aiEnergy, setAiEnergy] = useState(5);
  const [timeLeft, setTimeLeft] = useState(120);
  const [aiPersona] = useState<AIPersona>(['aggressive', 'balanced', 'defensive'][Math.floor(Math.random() * 3)] as AIPersona);
  const [aiLogs, setAiLogs] = useState<string[]>([]);

  const [playerTowers, setPlayerTowers] = useState([900, 900, 900]);
  const [aiTowers, setAiTowers] = useState([900, 900, 900]);
  const [playerCore, setPlayerCore] = useState(1800);
  const [aiCore, setAiCore] = useState(1800);

  const [running, setRunning] = useState(true);
  const aiThink = useRef(0);

  useEffect(() => {
    const cfg = parseBalanceConfig(localStorage.getItem('sws-balance-config'));
    setCards(cfg.units);
  }, []);

  function createUnit(card: UnitBalance, owner: Side, lane: number): Unit {
    return {
      uid: `${owner}-${card.id}-${Math.random().toString(36).slice(2, 8)}`,
      owner,
      cardId: card.id,
      lane,
      x: owner === 'player' ? 18 : 82,
      hp: card.hp,
      atk: card.atk,
      speed: card.speed,
      range: card.range,
      cooldown: 0
    };
  }

  function deploy(card: UnitBalance, lane: number) {
    if (!running) return;
    setPlayerEnergy((e) => {
      if (e < card.cost) return e;
      setUnits((prev) => [...prev, createUnit(card, 'player', lane)]);
      return Math.max(0, e - card.cost);
    });
  }

  useEffect(() => {
    if (!running) return;
    const dt = 0.1;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        const nt = Math.max(0, t - dt);
        if (nt <= 0) setRunning(false);
        return nt;
      });

      setPlayerEnergy((e) => Math.min(10, e + 0.08));
      setAiEnergy((e) => Math.min(10, e + 0.08));

      aiThink.current += dt;
      if (aiThink.current >= 1.2) {
        aiThink.current = 0;
        setAiEnergy((e) => {
          const pressure = [0, 1, 2].map((lane) => units.filter((u) => u.owner === 'player' && u.lane === lane).reduce((acc, u) => acc + u.hp, 0));
          const decision = decideAIDeploy({ energy: e, pressureByLane: pressure, cards, persona: aiPersona });
          if (!decision) return e;
          const chosen = cards.find((c) => c.id === decision.cardId);
          if (!chosen || e < chosen.cost) return e;
          setUnits((prev) => [...prev, createUnit(chosen, 'ai', decision.lane)]);
          setAiLogs((prev) => [`AI(${aiPersona})：${decision.reason} -> ${chosen.name} 线${decision.lane + 1}`, ...prev].slice(0, 6));
          return Math.max(0, e - chosen.cost);
        });
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
  }, [running, units, cards, aiPersona, aiTowers, playerTowers, playerCore, aiCore]);

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
  }, [running, playerCore, aiCore, timeLeft]);

  return (
    <main className="app-shell text-zinc-100">
      <header className="panel flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">BATTLE TEST</p>
          <h1 className="text-xl font-semibold">实时对战（皇室战争式）MVP</h1>
        </div>
        <Link href={params.get('from') === 'campaign' ? '/campaign' : '/'} className="text-sm text-cyan-300 hover:underline">
          {params.get('from') === 'campaign' ? '返回战役' : '返回首页'}
        </Link>
      </header>

      <section className="panel p-4">
        <div className="mb-3 grid gap-2 text-sm md:grid-cols-4">
          <p>⏱ 剩余：{Math.ceil(timeLeft)}s</p>
          <p>⚡ 我方能量：{playerEnergy.toFixed(1)}</p>
          <p>🤖 敌方能量：{aiEnergy.toFixed(1)}</p>
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
                    title={`${u.owner === 'player' ? '我' : '敌'}-${u.cardId}:${Math.round(u.hp)}`}
                  />
                ))}
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <p>🏯 我方本阵：{Math.round(playerCore)}</p>
          <p>🏯 敌方本阵：{Math.round(aiCore)}</p>
        </div>
        <div className="mt-2 text-xs text-zinc-400">AI 人格：{aiPersona}</div>
        <div className="mt-1 space-y-1 text-xs text-zinc-400">{aiLogs.map((l, i) => <p key={`${l}-${i}`}>- {l}</p>)}</div>
      </section>

      <section className="panel p-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:pb-4">
        <p className="mb-2 text-sm text-zinc-300">部署（选择兵种 + 线路）</p>
        <div className="grid gap-2 md:grid-cols-4">
          {cards.map((c) => (
            <div key={c.id} className="rounded-lg border border-zinc-700 bg-zinc-950/60 p-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-zinc-400">费用 {c.cost} · HP {c.hp} · ATK {c.atk}</p>
              <div className="mt-2 flex gap-1">
                {[0, 1, 2].map((lane) => (
                  <button key={`${c.id}-${lane}`} onClick={() => deploy(c, lane)} className="chip-btn px-2 py-1 text-xs">
                    线{lane + 1}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
