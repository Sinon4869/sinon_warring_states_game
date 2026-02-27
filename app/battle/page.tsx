'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { track } from '@/lib/telemetry';
import type { BattleWriteback } from '@/lib/game/types';
import { detectAssetTier, loadManifest, preloadAssets, selectAssets } from '@/lib/assets/pipeline';

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

type LaneOrder = 'hold' | 'push' | 'burst';

type CombatFx = {
  id: string;
  lane: number;
  x: number;
  text: string;
  color: 'cyan' | 'rose';
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
  const [laneOrders, setLaneOrders] = useState<LaneOrder[]>(['hold', 'hold', 'hold']);
  const [effects, setEffects] = useState<CombatFx[]>([]);
  const [assetStatus, setAssetStatus] = useState<'loading' | 'ready'>('loading');
  const [assetTier, setAssetTier] = useState<'high' | 'mid' | 'low'>('mid');
  const [shake, setShake] = useState(0);
  const [coreFlash, setCoreFlash] = useState<Side | null>(null);

  const aiThink = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFromCampaign(new URLSearchParams(window.location.search).get('from') === 'campaign');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tier = detectAssetTier();
    setAssetTier(tier);
    loadManifest()
      .then((manifest) => preloadAssets(selectAssets(manifest, tier)))
      .finally(() => {
        if (!cancelled) setAssetStatus('ready');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (shake <= 0) return;
    const t = setTimeout(() => setShake((v) => Math.max(0, v - 1)), 16);
    return () => clearTimeout(t);
  }, [shake]);

  const spawnFx = useCallback((lane: number, x: number, text: string, color: CombatFx['color']) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setEffects((prev) => [...prev, { id, lane, x, text, color }].slice(-40));
    setTimeout(() => {
      setEffects((prev) => prev.filter((f) => f.id !== id));
    }, 650);
  }, []);

  const deploy = useCallback((owner: Side, troop: Troop, lane: number) => {
    if (!running) return;
    const sameLane = units.filter((u) => u.owner === owner && u.lane === lane).length;
    const laneCap = 8;
    if (sameLane >= laneCap) {
      if (owner === 'player') spawnFx(lane, 26, '该路已满', 'rose');
      return;
    }

    if (owner === 'player') {
      const left = playerTroopCd[troop.id] ?? 0;
      if (left > 0) return;
      const order = laneOrders[lane] ?? 'hold';
      const cdFactor = order === 'burst' ? 1.2 : order === 'push' ? 1.1 : 1;
      setPlayerTroopCd((s) => ({ ...s, [troop.id]: Math.round(troop.cdMs * cdFactor) }));
    } else {
      const left = aiTroopCd[troop.id] ?? 0;
      if (left > 0) return;
      setAiTroopCd((s) => ({ ...s, [troop.id]: troop.cdMs }));
    }
    setUnits((prev) => [...prev, makeUnit(troop, owner, lane)]);
    spawnFx(lane, owner === 'player' ? 20 : 80, troop.name, owner === 'player' ? 'cyan' : 'rose');
    track({ name: owner === 'player' ? 'battle_deploy' : 'battle_ai_deploy', at: Date.now(), props: { troop: troop.id, lane } });
  }, [running, units, playerTroopCd, aiTroopCd, spawnFx, laneOrders]);

  const chooseAiAction = useCallback(() => {
    const laneStats = [0, 1, 2].map((lane) => {
      const playerPower = units.filter((u) => u.owner === 'player' && u.lane === lane).reduce((acc, u) => acc + u.hp + u.atk * 1.2, 0);
      const aiPower = units.filter((u) => u.owner === 'ai' && u.lane === lane).reduce((acc, u) => acc + u.hp + u.atk, 0);
      const danger = playerPower - aiPower;
      const towerRisk = (900 - aiTowers[lane]) * 0.6;
      const opportunity = (900 - playerTowers[lane]) * 0.5;
      return { lane, playerPower, aiPower, danger, towerRisk, opportunity };
    });

    const available = TROOPS.filter((t) => (aiTroopCd[t.id] ?? 0) <= 0);
    if (available.length === 0) return null;

    if (aiPersona === 'defensive') {
      const lane = laneStats.sort((a, b) => b.danger + b.towerRisk - (a.danger + a.towerRisk))[0].lane;
      const troop = available.sort((a, b) => b.hp - a.hp)[0];
      return { lane, troop, reason: '防守补线' };
    }

    if (aiPersona === 'aggressive') {
      const lane = laneStats.sort((a, b) => b.opportunity - b.danger * 0.25 - (a.opportunity - a.danger * 0.25))[0].lane;
      const troop = available.sort((a, b) => b.atk + b.speed - (a.atk + a.speed))[0];
      return { lane, troop, reason: '强攻破塔' };
    }

    const lane = laneStats.sort((a, b) => Math.abs(b.danger - b.opportunity) - Math.abs(a.danger - a.opportunity))[0].lane;
    const troop = available.sort((a, b) => b.atk + b.hp * 0.35 - (a.atk + a.hp * 0.35))[0];
    return { lane, troop, reason: '均衡换线' };
  }, [units, aiTowers, playerTowers, aiTroopCd, aiPersona]);

  useEffect(() => {
    if (!coreFlash) return;
    const t = setTimeout(() => setCoreFlash(null), 180);
    return () => clearTimeout(t);
  }, [coreFlash]);

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
        const action = chooseAiAction();
        if (action) {
          deploy('ai', action.troop, action.lane);
          setAiLogs((prev) => [`AI(${aiPersona})：${action.reason}，${action.troop.name} -> ${action.lane + 1}路`, ...prev].slice(0, 6));
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
          const order = unit.owner === 'player' ? laneOrders[unit.lane] ?? 'hold' : 'hold';
          const atkFactor = order === 'burst' ? 1.25 : order === 'push' ? 1.1 : 1;
          const moveFactor = order === 'push' ? 1.18 : order === 'hold' ? 0.92 : 1;

          if (nearest && Math.abs(nearest.x - unit.x) <= unit.range) {
            if (unit.cooldown <= 0) {
              const damage = Math.round(unit.atk * atkFactor);
              nearest.hp -= damage;
              spawnFx(unit.lane, nearest.x, `-${damage}`, unit.owner === 'player' ? 'cyan' : 'rose');
              unit.cooldown = order === 'burst' ? 0.95 : 0.8;
            }
            continue;
          }

          const targetTower = unit.owner === 'player' ? aT : pT;
          const towerX = unit.owner === 'player' ? 88 : 12;
          if (targetTower[unit.lane] > 0 && Math.abs(unit.x - towerX) <= unit.range) {
            if (unit.cooldown <= 0) {
              targetTower[unit.lane] -= unit.atk;
              spawnFx(unit.lane, towerX, `塔-${unit.atk}`, unit.owner === 'player' ? 'cyan' : 'rose');
              unit.cooldown = 0.8;
            }
            continue;
          }

          const coreX = unit.owner === 'player' ? 96 : 4;
          if (Math.abs(unit.x - coreX) <= unit.range) {
            if (unit.cooldown <= 0) {
              if (unit.owner === 'player') {
                aCore -= unit.atk;
                setCoreFlash('ai');
              } else {
                pCore -= unit.atk;
                setCoreFlash('player');
              }
              setShake(10);
              spawnFx(unit.lane, coreX, `本阵-${unit.atk}`, unit.owner === 'player' ? 'cyan' : 'rose');
              unit.cooldown = 0.8;
            }
            continue;
          }

          unit.x += (unit.owner === 'player' ? 1 : -1) * unit.speed * moveFactor * dt;
        }

        const towerShoot = (owner: Side, lane: number, towerHp: number) => {
          if (towerHp <= 0) return;
          const x = owner === 'player' ? 12 : 88;
          const enemies = next.filter((u) => u.owner !== owner && u.lane === lane && Math.abs(u.x - x) <= 18 && u.hp > 0);
          if (enemies.length > 0) {
            enemies[0].hp -= 16;
            spawnFx(lane, enemies[0].x, '-16', owner === 'player' ? 'cyan' : 'rose');
          }
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
  }, [running, units, aiPersona, playerTroopCd, aiTroopCd, aiTowers, playerTowers, playerCore, aiCore, deploy, spawnFx, laneOrders, chooseAiAction]);

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
    <main
      className="app-shell text-zinc-100"
      style={{ transform: shake > 0 ? `translate(${shake % 2 === 0 ? -2 : 2}px, 0px)` : 'translate(0,0)', transition: 'transform 30ms linear' }}
    >
      <header className="panel flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">TACTICAL BATTLE</p>
          <h1 className="text-xl font-semibold">无卡纯对战模式</h1>
        </div>
        <Link href={fromCampaign ? '/campaign' : '/'} className="text-sm text-cyan-300 hover:underline">
          {fromCampaign ? '返回战役' : '返回首页'}
        </Link>
      </header>

      <section className="panel space-y-3 p-4">
        <div className="grid gap-2 text-sm md:grid-cols-4">
          <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">⏱ 剩余：{Math.ceil(timeLeft)}s</div>
          <div className={`rounded-md border px-3 py-2 ${coreFlash === 'player' ? 'border-rose-400 bg-rose-500/20' : 'border-zinc-700 bg-zinc-900/70'}`}>🛡 我方本阵：{Math.round(playerCore)}</div>
          <div className={`rounded-md border px-3 py-2 ${coreFlash === 'ai' ? 'border-cyan-400 bg-cyan-500/20' : 'border-zinc-700 bg-zinc-900/70'}`}>🏴 敌方本阵：{Math.round(aiCore)}</div>
          <div className="rounded-md border border-cyan-500/30 bg-zinc-900/70 px-3 py-2 font-semibold text-cyan-300">{result || '战斗进行中...'}</div>
        </div>
        <p className="text-[11px] text-zinc-500">资源管线：{assetStatus === 'ready' ? `就绪（${assetTier}）` : '加载中...'}</p>

        <div className="space-y-2">
          {[0, 1, 2].map((lane) => {
            const playerPower = units.filter((u) => u.owner === 'player' && u.lane === lane).reduce((a, b) => a + b.hp, 0);
            const aiPower = units.filter((u) => u.owner === 'ai' && u.lane === lane).reduce((a, b) => a + b.hp, 0);
            const total = Math.max(1, playerPower + aiPower);
            const playerPct = (playerPower / total) * 100;
            return (
              <div key={lane} className="relative h-20 overflow-hidden rounded border border-zinc-700 bg-zinc-950/70">
                <div className="absolute inset-x-0 top-0 h-1 bg-zinc-800">
                  <div className="h-full bg-cyan-400/70" style={{ width: `${playerPct}%` }} />
                </div>
                <div className="absolute left-2 top-2 text-[10px] text-zinc-400">第{lane + 1}路 · 我塔 {Math.round(playerTowers[lane])}</div>
                <div className="absolute right-2 top-2 text-[10px] text-zinc-400">敌塔 {Math.round(aiTowers[lane])}</div>
                <div className="absolute inset-y-0 left-[50%] w-px bg-cyan-500/30" />
                <AnimatePresence>
                  {units
                    .filter((u) => u.lane === lane)
                    .map((u) => (
                      <motion.div
                        key={u.uid}
                        className={`absolute top-10 h-3 w-3 rounded-full ${u.owner === 'player' ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]' : 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.8)]'}`}
                        style={{ left: `calc(${u.x}% - 6px)` }}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: u.cooldown > 0 ? 1.25 : 1, opacity: 1 }}
                        exit={{ scale: 0.1, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        title={`${u.owner === 'player' ? '我' : '敌'}-${u.troopId}:${Math.round(u.hp)}`}
                      />
                    ))}
                </AnimatePresence>
                <AnimatePresence>
                  {effects
                    .filter((f) => f.lane === lane)
                    .map((f) => (
                      <motion.div
                        key={f.id}
                        className={`absolute top-9 text-[10px] font-semibold ${f.color === 'cyan' ? 'text-cyan-300' : 'text-rose-300'}`}
                        style={{ left: `calc(${f.x}% - 10px)` }}
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: -12, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.45 }}
                      >
                        {f.text}
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-400">AI 人格：{aiPersona}</p>
        <div className="space-y-1 text-xs text-zinc-400">{aiLogs.map((l, i) => <p key={`${l}-${i}`}>- {l}</p>)}</div>
      </section>

      <section className="panel p-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:pb-4">
        <p className="mb-2 text-sm text-zinc-300">线路战术指令（无卡）</p>
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          {[0, 1, 2].map((lane) => {
            const order = laneOrders[lane];
            const playerCount = units.filter((u) => u.owner === 'player' && u.lane === lane).length;
            return (
              <div key={`order-${lane}`} className="rounded-lg border border-zinc-700 bg-zinc-950/60 p-3">
                <p className="text-xs text-zinc-400">第{lane + 1}路 · 驻军 {playerCount}/8</p>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {([
                    ['hold', '固守'],
                    ['push', '推进'],
                    ['burst', '强攻']
                  ] as const).map(([k, label]) => (
                    <button
                      key={`${lane}-${k}`}
                      onClick={() => setLaneOrders((prev) => prev.map((v, i) => (i === lane ? k : v)) as LaneOrder[])}
                      className={`chip-btn px-1 py-1 text-[11px] ${order === k ? 'border-cyan-400/70 text-cyan-300' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

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
