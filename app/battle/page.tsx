'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { track } from '@/lib/telemetry';
import type { BattleWriteback } from '@/lib/game/types';
import { detectAssetTier, loadManifest, preloadAssets, selectAssets } from '@/lib/assets/pipeline';
import { getPveStage } from '@/lib/game/pve';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

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

type BattleContext = {
  id: string;
  region: string;
  terrain: 'plain' | 'mountain' | 'river';
  enemyPower: number;
  supply: number;
  objective: string;
  recommended: 'expand' | 'fortify' | 'rest';
};

const TROOPS: Troop[] = [
  { id: 'infantry', name: '步兵', hp: 120, atk: 16, speed: 10, range: 4, cdMs: 2200 },
  { id: 'spear', name: '枪兵', hp: 95, atk: 19, speed: 11, range: 5, cdMs: 2600 },
  { id: 'cavalry', name: '骑兵', hp: 150, atk: 22, speed: 14, range: 5, cdMs: 3600 },
  { id: 'archer', name: '弓兵', hp: 75, atk: 18, speed: 8, range: 12, cdMs: 3000 }
];

const TROOP_ART: Record<string, string> = {
  infantry: '/assets/units/infantry.svg',
  spear: '/assets/units/spear.svg',
  cavalry: '/assets/units/cavalry.svg',
  archer: '/assets/units/archer.svg'
};

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
  const [battleMode, setBattleMode] = useState<'normal' | 'pve' | 'campaign'>('normal');
  const [stageName, setStageName] = useState<string>('标准对战');
  const [campaignContext, setCampaignContext] = useState<BattleContext | null>(null);
  const [blockedByFlow, setBlockedByFlow] = useState(false);
  const [atkRate, setAtkRate] = useState<{ player: number; ai: number }>({ player: 1, ai: 1 });
  const [aiPersona, setAiPersona] = useState<'aggressive' | 'balanced' | 'defensive'>(() => {
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
  const [selectedLane, setSelectedLane] = useState(1);
  const [effects, setEffects] = useState<CombatFx[]>([]);
  const [assetStatus, setAssetStatus] = useState<'loading' | 'ready'>('loading');
  const [assetTier, setAssetTier] = useState<'high' | 'mid' | 'low'>('mid');
  const [shake, setShake] = useState(0);
  const [coreFlash, setCoreFlash] = useState<Side | null>(null);

  const aiThink = useRef(0);
  const matchIdRef = useRef(`m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const startedRef = useRef(false);
  const timeLimitRef = useRef(120);

  const unitsRef = useRef<Unit[]>([]);
  const playerTowersRef = useRef<[number, number, number]>([900, 900, 900]);
  const aiTowersRef = useRef<[number, number, number]>([900, 900, 900]);
  const playerCoreRef = useRef(1800);
  const aiCoreRef = useRef(1800);
  const playerTroopCdRef = useRef<Record<string, number>>({});
  const aiTroopCdRef = useRef<Record<string, number>>({});
  const laneOrdersRef = useRef<LaneOrder[]>(['hold', 'hold', 'hold']);
  const aiPersonaRef = useRef<'aggressive' | 'balanced' | 'defensive'>(aiPersona);
  const atkRateRef = useRef<{ player: number; ai: number }>({ player: 1, ai: 1 });
  const battleModeRef = useRef<'normal' | 'pve' | 'campaign'>('normal');
  const stageNameRef = useRef('标准对战');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from') === 'campaign';
    setFromCampaign(from);

    const mode = params.get('mode');
    const stage = getPveStage(params.get('stage'));
    if (mode === 'pve' && stage) {
      setBattleMode('pve');
      setStageName(`${stage.id.toUpperCase()} ${stage.name}`);
      setAiPersona(stage.aiPersona);
      setTimeLeft(stage.timeLimit);
      timeLimitRef.current = stage.timeLimit;
      setPlayerCore(stage.playerCore);
      setAiCore(stage.aiCore);
      setAtkRate({ player: stage.playerAtkRate, ai: stage.aiAtkRate });
      battleModeRef.current = 'pve';
      stageNameRef.current = `${stage.id.toUpperCase()} ${stage.name}`;
    }

    if (from && params.get('context') === '1') {
      const raw = localStorage.getItem('sws-battle-context');
      if (!raw) {
        setBlockedByFlow(true);
      } else {
        try {
          const ctx = JSON.parse(raw) as BattleContext;
          setCampaignContext(ctx);
          setBattleMode('campaign');
          battleModeRef.current = 'campaign';
          setStageName(`${ctx.region} · ${ctx.objective}`);
          stageNameRef.current = `${ctx.region} · ${ctx.objective}`;
          const terrainRate = ctx.terrain === 'mountain' ? { player: 0.95, ai: 1.08 } : ctx.terrain === 'river' ? { player: 1.02, ai: 1.05 } : { player: 1, ai: 1 };
          const supplyRate = ctx.supply >= 70 ? 1.08 : ctx.supply <= 45 ? 0.92 : 1;
          setAtkRate({ player: Number((terrainRate.player * supplyRate).toFixed(2)), ai: terrainRate.ai });
        } catch {
          setBlockedByFlow(true);
        }
      }
    }

    if (!startedRef.current) {
      startedRef.current = true;
      track({
        name: 'battle_start',
        at: Date.now(),
        props: { matchId: matchIdRef.current, mode: battleModeRef.current, stage: stageNameRef.current, version: APP_VERSION }
      });
    }
  }, []);

  useEffect(() => { unitsRef.current = units; }, [units]);
  useEffect(() => { playerTowersRef.current = playerTowers as [number, number, number]; }, [playerTowers]);
  useEffect(() => { aiTowersRef.current = aiTowers as [number, number, number]; }, [aiTowers]);
  useEffect(() => { playerCoreRef.current = playerCore; }, [playerCore]);
  useEffect(() => { aiCoreRef.current = aiCore; }, [aiCore]);
  useEffect(() => { playerTroopCdRef.current = playerTroopCd; }, [playerTroopCd]);
  useEffect(() => { aiTroopCdRef.current = aiTroopCd; }, [aiTroopCd]);
  useEffect(() => { laneOrdersRef.current = laneOrders; }, [laneOrders]);
  useEffect(() => { aiPersonaRef.current = aiPersona; }, [aiPersona]);
  useEffect(() => { atkRateRef.current = atkRate; }, [atkRate]);
  useEffect(() => { battleModeRef.current = battleMode; }, [battleMode]);
  useEffect(() => { stageNameRef.current = stageName; }, [stageName]);

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
    const sameLane = unitsRef.current.filter((u) => u.owner === owner && u.lane === lane).length;
    const laneCap = 8;
    if (sameLane >= laneCap) {
      if (owner === 'player') spawnFx(lane, 26, '该路已满', 'rose');
      return;
    }

    if (owner === 'player') {
      const left = playerTroopCdRef.current[troop.id] ?? 0;
      if (left > 0) return;
      const order = laneOrdersRef.current[lane] ?? 'hold';
      const cdFactor = order === 'burst' ? 1.2 : order === 'push' ? 1.1 : 1;
      const nextCd = { ...playerTroopCdRef.current, [troop.id]: Math.round(troop.cdMs * cdFactor) };
      playerTroopCdRef.current = nextCd;
      setPlayerTroopCd(nextCd);
    } else {
      const left = aiTroopCdRef.current[troop.id] ?? 0;
      if (left > 0) return;
      const nextCd = { ...aiTroopCdRef.current, [troop.id]: troop.cdMs };
      aiTroopCdRef.current = nextCd;
      setAiTroopCd(nextCd);
    }

    const nextUnits = [...unitsRef.current, makeUnit(troop, owner, lane)];
    unitsRef.current = nextUnits;
    setUnits(nextUnits);
    spawnFx(lane, owner === 'player' ? 20 : 80, troop.name, owner === 'player' ? 'cyan' : 'rose');
    track({
      name: owner === 'player' ? 'battle_deploy' : 'battle_ai_deploy',
      at: Date.now(),
      props: { matchId: matchIdRef.current, troop: troop.id, lane }
    });
  }, [running, spawnFx]);

  const chooseAiAction = useCallback(() => {
    const laneStats = [0, 1, 2].map((lane) => {
      const playerPower = unitsRef.current.filter((u) => u.owner === 'player' && u.lane === lane).reduce((acc, u) => acc + u.hp + u.atk * 1.2, 0);
      const aiPower = unitsRef.current.filter((u) => u.owner === 'ai' && u.lane === lane).reduce((acc, u) => acc + u.hp + u.atk, 0);
      const danger = playerPower - aiPower;
      const towerRisk = (900 - aiTowersRef.current[lane]) * 0.6;
      const opportunity = (900 - playerTowersRef.current[lane]) * 0.5;
      return { lane, playerPower, aiPower, danger, towerRisk, opportunity };
    });

    const available = TROOPS.filter((t) => (aiTroopCdRef.current[t.id] ?? 0) <= 0);
    if (available.length === 0) return null;

    const persona = aiPersonaRef.current;
    if (persona === 'defensive') {
      const lane = [...laneStats].sort((a, b) => b.danger + b.towerRisk - (a.danger + a.towerRisk))[0].lane;
      const troop = [...available].sort((a, b) => b.hp - a.hp)[0];
      return { lane, troop, reason: '防守补线' };
    }

    if (persona === 'aggressive') {
      const lane = [...laneStats].sort((a, b) => b.opportunity - b.danger * 0.25 - (a.opportunity - a.danger * 0.25))[0].lane;
      const troop = [...available].sort((a, b) => b.atk + b.speed - (a.atk + a.speed))[0];
      return { lane, troop, reason: '强攻破塔' };
    }

    const lane = [...laneStats].sort((a, b) => Math.abs(b.danger - b.opportunity) - Math.abs(a.danger - a.opportunity))[0].lane;
    const troop = [...available].sort((a, b) => b.atk + b.hp * 0.35 - (a.atk + a.hp * 0.35))[0];
    return { lane, troop, reason: '均衡换线' };
  }, []);

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
        playerTroopCdRef.current = next;
        return next;
      });
      setAiTroopCd((prev) => {
        const next: Record<string, number> = {};
        for (const t of TROOPS) next[t.id] = Math.max(0, (prev[t.id] ?? 0) - dt * 1000);
        aiTroopCdRef.current = next;
        return next;
      });

      aiThink.current += dt;
      if (aiThink.current >= 1.2) {
        aiThink.current = 0;
        const action = chooseAiAction();
        if (action) {
          deploy('ai', action.troop, action.lane);
          track({
            name: 'battle_ai_decision',
            at: Date.now(),
            props: {
              matchId: matchIdRef.current,
              persona: aiPersonaRef.current,
              reason: action.reason,
              lane: action.lane,
              troop: action.troop.id,
              mode: battleModeRef.current,
              stage: stageNameRef.current
            }
          });
          setAiLogs((prev) => [`AI(${aiPersonaRef.current})：${action.reason}，${action.troop.name} -> ${action.lane + 1}路`, ...prev].slice(0, 6));
        }
      }

      setUnits((prevUnits) => {
        const next = prevUnits.map((u) => ({ ...u, cooldown: Math.max(0, u.cooldown - dt) }));
        const pT = [...playerTowersRef.current];
        const aT = [...aiTowersRef.current];
        let pCore = playerCoreRef.current;
        let aCore = aiCoreRef.current;

        for (const unit of next) {
          const enemies = next.filter((x) => x.owner !== unit.owner && x.lane === unit.lane && x.hp > 0);
          const nearest = enemies.sort((a, b) => Math.abs(a.x - unit.x) - Math.abs(b.x - unit.x))[0];
          const order = unit.owner === 'player' ? laneOrdersRef.current[unit.lane] ?? 'hold' : 'hold';
          const sideRate = unit.owner === 'player' ? atkRateRef.current.player : atkRateRef.current.ai;
          const atkFactor = (order === 'burst' ? 1.25 : order === 'push' ? 1.1 : 1) * sideRate;
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
              const towerDamage = Math.round(unit.atk * sideRate);
              targetTower[unit.lane] -= towerDamage;
              spawnFx(unit.lane, towerX, `塔-${towerDamage}`, unit.owner === 'player' ? 'cyan' : 'rose');
              track({
                name: 'battle_tower_hit',
                at: Date.now(),
                props: { matchId: matchIdRef.current, lane: unit.lane, by: unit.owner, damage: towerDamage }
              });
              unit.cooldown = 0.8;
            }
            continue;
          }

          const coreX = unit.owner === 'player' ? 96 : 4;
          if (Math.abs(unit.x - coreX) <= unit.range) {
            if (unit.cooldown <= 0) {
              const coreDamage = Math.round(unit.atk * sideRate);
              if (unit.owner === 'player') {
                aCore -= coreDamage;
                setCoreFlash('ai');
              } else {
                pCore -= coreDamage;
                setCoreFlash('player');
              }
              setShake(10);
              spawnFx(unit.lane, coreX, `本阵-${coreDamage}`, unit.owner === 'player' ? 'cyan' : 'rose');
              track({
                name: 'battle_core_hit',
                at: Date.now(),
                props: { matchId: matchIdRef.current, lane: unit.lane, by: unit.owner, damage: coreDamage }
              });
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
        playerTowersRef.current = pT as [number, number, number];
        aiTowersRef.current = aT as [number, number, number];
        playerCoreRef.current = pCore;
        aiCoreRef.current = aCore;
        setPlayerTowers(pT as [number, number, number]);
        setAiTowers(aT as [number, number, number]);
        setPlayerCore(pCore);
        setAiCore(aCore);

        if (pCore <= 0 || aCore <= 0) setRunning(false);

        return next.filter((u) => u.hp > 0 && u.x >= 0 && u.x <= 100);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [running, deploy, spawnFx, chooseAiAction]);

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
      turnsUsed: Math.max(0, timeLimitRef.current - Math.ceil(timeLeft))
    };
    localStorage.setItem('sws-battle-report', JSON.stringify(report));
    track({
      name: 'battle_result',
      at: Date.now(),
      props: { matchId: matchIdRef.current, winner, turnsUsed: report.turnsUsed, mode: battleMode, stage: stageName, version: APP_VERSION, contextId: campaignContext?.id ?? null }
    });
  }, [running, playerCore, aiCore, timeLeft, battleMode, stageName, campaignContext]);

  if (blockedByFlow) {
    return (
      <main className="app-shell text-zinc-100">
        <section className="panel p-4">
          <h1 className="text-lg font-semibold">战斗流程已拦截</h1>
          <p className="mt-2 text-sm text-zinc-400">当前没有待处理的战役冲突。请先在战役页推进回合并触发边境冲突。</p>
          <Link href="/campaign" className="mt-3 inline-block text-cyan-300 hover:underline">返回战役</Link>
        </section>
      </main>
    );
  }

  return (
    <main
      className="app-shell text-zinc-100"
      style={{ transform: shake > 0 ? `translate(${shake % 2 === 0 ? -2 : 2}px, 0px)` : 'translate(0,0)', transition: 'transform 30ms linear' }}
    >
      <header className="panel flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">TACTICAL BATTLE · {battleMode.toUpperCase()}</p>
          <h1 className="text-xl font-semibold">无卡纯对战模式</h1>
          <p className="text-xs text-zinc-500">关卡：{stageName}</p>
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
              <div key={lane} className="relative h-24 overflow-hidden rounded border border-zinc-700 bg-gradient-to-r from-zinc-950/90 via-slate-900/80 to-zinc-950/90">
                <div className="absolute inset-x-0 top-0 h-1 bg-zinc-800">
                  <div className="h-full bg-cyan-400/70" style={{ width: `${playerPct}%` }} />
                </div>
                <div className="absolute left-2 top-2 text-[10px] text-zinc-400">第{lane + 1}路 · 我塔 {Math.round(playerTowers[lane])}</div>
                <div className="absolute right-2 top-2 text-[10px] text-zinc-400">敌塔 {Math.round(aiTowers[lane])}</div>
                <div className="absolute inset-y-0 left-[50%] w-px bg-cyan-500/30" />
                <div className="absolute inset-x-0 top-[58%] h-[2px] bg-zinc-700/60" />
                <AnimatePresence>
                  {units
                    .filter((u) => u.lane === lane)
                    .map((u) => (
                      <motion.div
                        key={u.uid}
                        className={`absolute top-9 w-7 ${u.owner === 'player' ? '' : ''}`}
                        style={{ left: `calc(${u.x}% - 14px)` }}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: u.cooldown > 0 ? 1.12 : 1, opacity: 1 }}
                        exit={{ scale: 0.1, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        title={`${u.owner === 'player' ? '我' : '敌'}-${u.troopId}:${Math.round(u.hp)}`}
                      >
                        <img
                          src={TROOP_ART[u.troopId] ?? '/assets/units/fallback.svg'}
                          alt={u.troopId}
                          className={`h-7 w-7 rounded ${u.owner === 'player' ? 'ring-1 ring-cyan-300/70' : 'ring-1 ring-rose-300/70'}`}
                        />
                        <div className="mt-0.5 h-1 w-7 rounded bg-zinc-800">
                          <div className={`h-1 rounded ${u.owner === 'player' ? 'bg-cyan-400' : 'bg-rose-400'}`} style={{ width: `${Math.max(8, Math.min(100, (u.hp / 150) * 100))}%` }} />
                        </div>
                      </motion.div>
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
        <p className="mb-2 text-sm text-zinc-300">单手操作模式（先选一路，再点兵种）</p>
        <div className="mb-3 rounded-lg border border-zinc-700 bg-zinc-950/60 p-3">
          <div className="mb-2 flex gap-2">
            {[0, 1, 2].map((lane) => (
              <button
                key={`lane-select-${lane}`}
                onClick={() => setSelectedLane(lane)}
                className={`chip-btn flex-1 ${selectedLane === lane ? 'border-cyan-400/70 text-cyan-300' : ''}`}
              >
                第{lane + 1}路
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {([
              ['hold', '固守'],
              ['push', '推进'],
              ['burst', '强攻']
            ] as const).map(([k, label]) => (
              <button
                key={`selected-${k}`}
                onClick={() => setLaneOrders((prev) => prev.map((v, i) => (i === selectedLane ? k : v)) as LaneOrder[])}
                className={`chip-btn flex-1 ${laneOrders[selectedLane] === k ? 'border-cyan-400/70 text-cyan-300' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-400">当前指挥：第{selectedLane + 1}路 / {laneOrders[selectedLane] === 'hold' ? '固守' : laneOrders[selectedLane] === 'push' ? '推进' : '强攻'}</p>
        </div>

        <p className="mb-2 text-sm text-zinc-300">兵种调度（点击即投放到当前路线）</p>
        <div className="grid gap-2 md:grid-cols-4">
          {TROOPS.map((t) => {
            const cd = playerTroopCd[t.id] ?? 0;
            const disabled = cd > 0 || !running;
            return (
              <div key={t.id} className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-3 shadow-[0_0_18px_rgba(34,211,238,0.08)]">
                <div className="flex items-center gap-2">
                  <img src={TROOP_ART[t.id] ?? '/assets/units/fallback.svg'} alt={t.name} className="h-9 w-9 rounded border border-zinc-600" />
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-zinc-400">CD {Math.ceil(t.cdMs / 1000)}s · HP {t.hp} · ATK {t.atk}</p>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-cyan-300">{cd > 0 ? `冷却中 ${Math.ceil(cd / 1000)}s` : '可用'}</p>
                <div className="mt-2">
                  <button
                    onClick={() => deploy('player', t, selectedLane)}
                    disabled={disabled}
                    className="chip-btn w-full px-2 py-1 text-xs"
                  >
                    投放到第{selectedLane + 1}路
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="fixed inset-x-0 bottom-0 z-20 border-t border-cyan-500/30 bg-zinc-950/90 px-3 py-2 backdrop-blur md:hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
        <p className="mb-1 text-[11px] text-zinc-400">移动端快操：先选路线，再点兵种</p>
        <div className="mb-2 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((lane) => (
            <button
              key={`quick-lane-${lane}`}
              onClick={() => setSelectedLane(lane)}
              className={`chip-btn text-xs ${selectedLane === lane ? 'border-cyan-400/70 text-cyan-300' : ''}`}
            >
              第{lane + 1}路
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {TROOPS.map((t) => (
            <button
              key={`quick-troop-${t.id}`}
              onClick={() => deploy('player', t, selectedLane)}
              className="chip-btn border-cyan-400/60 text-xs"
            >
              {t.name}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
