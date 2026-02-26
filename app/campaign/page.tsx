'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type GameState = {
  turn: number;
  year: number;
  pop: number;
  food: number;
  gold: number;
  army: number;
  order: number;
  prestige: number;
  land: number;
  enemyLand: number;
  logs: string[];
};

const INIT: GameState = {
  turn: 1,
  year: 1560,
  pop: 100,
  food: 120,
  gold: 120,
  army: 80,
  order: 70,
  prestige: 30,
  land: 1,
  enemyLand: 9,
  logs: ['开局：你在乱世中占据一隅之地。']
};

const ACTIONS = [
  { id: 'farm', label: '农业开发', run: (s: GameState) => ({ ...s, food: s.food + 24, pop: s.pop + 3, order: s.order + 1 }) },
  { id: 'trade', label: '商业投资', run: (s: GameState) => ({ ...s, gold: s.gold + 28, pop: s.pop + 2 }) },
  {
    id: 'recruit',
    label: '征兵训练',
    run: (s: GameState) => ({ ...s, army: s.army + 18, gold: Math.max(0, s.gold - 22), order: Math.max(0, s.order - 2) })
  },
  { id: 'pacify', label: '安抚治安', run: (s: GameState) => ({ ...s, order: Math.min(100, s.order + 8), gold: Math.max(0, s.gold - 10) }) },
  { id: 'diplomacy', label: '外交操作', run: (s: GameState) => ({ ...s, prestige: Math.min(100, s.prestige + 6), gold: Math.max(0, s.gold - 8) }) }
] as const;

function clamp(v: number, min = 0, max = 9999) {
  return Math.max(min, Math.min(max, v));
}

export default function CampaignPage() {
  const [state, setState] = useState<GameState>(INIT);
  const [actionsLeft, setActionsLeft] = useState(3);
  const [result, setResult] = useState('');

  const status = useMemo(() => {
    if (state.land >= 10) return '🏆 天下布武达成';
    if (state.pop <= 0 || state.order <= 0 || state.food <= 0) return '💀 国崩人散';
    return '进行中';
  }, [state]);

  function applyAction(id: string) {
    if (actionsLeft <= 0 || status !== '进行中') return;
    const action = ACTIONS.find((a) => a.id === id);
    if (!action) return;

    setState((prev) => {
      const next = action.run(prev);
      return {
        ...next,
        pop: clamp(next.pop, 0, 999),
        food: clamp(next.food, 0, 999),
        gold: clamp(next.gold, 0, 999),
        army: clamp(next.army, 0, 999),
        order: clamp(next.order, 0, 100),
        prestige: clamp(next.prestige, 0, 100),
        logs: [`第${prev.turn}回合执行：${action.label}`, ...prev.logs].slice(0, 12)
      };
    });

    setActionsLeft((x) => x - 1);
  }

  function endTurn() {
    if (status !== '进行中') return;

    setState((prev) => {
      const next = { ...prev };

      // base settlement
      next.food = clamp(next.food + Math.floor(next.pop * 0.08) - Math.floor(next.army * 0.05));
      next.gold = clamp(next.gold + Math.floor(next.pop * 0.07) + Math.floor(next.land * 5));

      // shortages
      if (next.food < 30) {
        next.pop = clamp(next.pop - 8);
        next.order = clamp(next.order - 7, 0, 100);
      }

      // random event
      const r = Math.random();
      let event = '无重大事件';
      if (r < 0.18) {
        next.order = clamp(next.order - 10, 0, 100);
        next.pop = clamp(next.pop - 5);
        event = '灾害：民心受损';
      } else if (r < 0.34) {
        next.prestige = clamp(next.prestige + 5, 0, 100);
        next.gold = clamp(next.gold + 16);
        event = '名望上升：豪商资助';
      } else if (r < 0.5) {
        next.army = clamp(next.army + 10);
        event = '浪人来投：兵力增加';
      }

      // war check (simulating campaign battle result)
      const warPower = next.army + next.prestige * 0.5 + next.order * 0.4;
      const enemyPower = 90 + next.enemyLand * 8 + Math.random() * 60;
      let battle = '边境平稳';

      if (Math.random() < 0.45) {
        if (warPower >= enemyPower) {
          next.land = clamp(next.land + 1, 0, 10);
          next.enemyLand = clamp(next.enemyLand - 1, 0, 10);
          next.prestige = clamp(next.prestige + 6, 0, 100);
          next.army = clamp(next.army - 12);
          battle = '战役胜利：夺取一国';
        } else {
          next.order = clamp(next.order - 8, 0, 100);
          next.army = clamp(next.army - 18);
          next.land = clamp(next.land - 1, 0, 10);
          next.enemyLand = clamp(next.enemyLand + 1, 0, 10);
          battle = '战役失利：丢失领地';
        }
      }

      next.turn += 1;
      if (next.turn % 4 === 1) next.year += 1;
      next.logs = [`结算：${event}；${battle}`, ...next.logs].slice(0, 12);

      return next;
    });

    setActionsLeft(3);
  }

  function save() {
    localStorage.setItem('sws-campaign-save', JSON.stringify(state));
    setResult('已存档');
  }

  function load() {
    const raw = localStorage.getItem('sws-campaign-save');
    if (!raw) {
      setResult('无存档');
      return;
    }
    try {
      const parsed = JSON.parse(raw) as GameState;
      setState(parsed);
      setActionsLeft(3);
      setResult('已读档');
    } catch {
      setResult('存档损坏');
    }
  }

  function reset() {
    setState(INIT);
    setActionsLeft(3);
    setResult('已重开');
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-4 p-4 text-zinc-100 md:p-8">
      <header className="flex items-center justify-between rounded-xl border border-cyan-400/30 bg-zinc-900/70 px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">CAMPAIGN MVP</p>
          <h1 className="text-xl font-semibold">天下布武 · 回合治理</h1>
          <p className="text-xs text-zinc-400">回合 {state.turn} · 年份 {state.year} · 状态：{status}</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/battle" className="text-cyan-300 hover:underline">去实时战斗</Link>
          <Link href="/" className="text-cyan-300 hover:underline">首页</Link>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ['人口', state.pop],
          ['粮食', state.food],
          ['金钱', state.gold],
          ['军力', state.army],
          ['治安', state.order],
          ['威望', state.prestige],
          ['领地', `${state.land} / 10`],
          ['敌方领地', state.enemyLand]
        ].map(([k, v]) => (
          <article key={String(k)} className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
            <p className="text-xs text-zinc-400">{k}</p>
            <p className="mt-1 text-xl font-semibold">{v}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-cyan-400/20 bg-zinc-900/60 p-4">
        <p className="mb-2 text-sm">行动点：{actionsLeft}/3</p>
        <div className="grid gap-2 md:grid-cols-5">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              disabled={actionsLeft <= 0 || status !== '进行中'}
              onClick={() => applyAction(a.id)}
              className="rounded border border-cyan-500/50 px-3 py-2 text-sm hover:bg-cyan-500/20 disabled:opacity-40"
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={endTurn} className="rounded border border-emerald-500/60 px-3 py-2 text-sm hover:bg-emerald-500/20">
            回合结算
          </button>
          <button onClick={save} className="rounded border border-zinc-500 px-3 py-2 text-sm hover:bg-zinc-700/30">存档</button>
          <button onClick={load} className="rounded border border-zinc-500 px-3 py-2 text-sm hover:bg-zinc-700/30">读档</button>
          <button onClick={reset} className="rounded border border-rose-500/60 px-3 py-2 text-sm hover:bg-rose-500/20">重开</button>
          {result && <p className="self-center text-xs text-cyan-300">{result}</p>}
        </div>
      </section>

      <section className="rounded-xl border border-cyan-400/20 bg-zinc-900/60 p-4">
        <h2 className="mb-2 text-base font-semibold">回合日志</h2>
        <div className="space-y-1 text-sm text-zinc-300">
          {state.logs.map((l, i) => (
            <p key={`${l}-${i}`}>- {l}</p>
          ))}
        </div>
      </section>
    </main>
  );
}
