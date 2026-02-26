'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DEFAULT_BALANCE, parseBalanceConfig } from '@/lib/game/balance';

export default function BalancePage() {
  const [raw, setRaw] = useState(JSON.stringify(DEFAULT_BALANCE, null, 2));
  const [sim, setSim] = useState<{ rounds: number; player: number; ai: number; draw: number; playerWinRate: number } | null>(null);
  const [msg, setMsg] = useState('');

  const parsed = useMemo(() => parseBalanceConfig(raw), [raw]);

  async function runSim() {
    setMsg('模拟中...');
    const res = await fetch('/api/game/balance/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: parsed, rounds: 200 })
    });
    const data = await res.json();
    setSim(data);
    setMsg('模拟完成');
  }

  function saveConfig() {
    localStorage.setItem('sws-balance-config', JSON.stringify(parsed));
    setMsg('已保存配置（战斗/战役将读取此配置）');
  }

  function loadConfig() {
    const rawLocal = localStorage.getItem('sws-balance-config');
    const cfg = parseBalanceConfig(rawLocal);
    setRaw(JSON.stringify(cfg, null, 2));
    setMsg('已加载本地配置');
  }

  return (
    <main className="app-shell text-zinc-100">
      <header className="panel flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">BALANCE LAB</p>
          <h1 className="panel-title">数值平衡与调参</h1>
        </div>
        <Link href="/" className="text-sm text-cyan-300 hover:underline">首页</Link>
      </header>

      <section className="panel p-4">
        <p className="mb-2 text-sm text-zinc-300">配置 JSON（无需改核心代码）</p>
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="min-h-[320px] w-full rounded border border-zinc-700 bg-zinc-950/70 p-3 font-mono text-xs" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="chip-btn" onClick={saveConfig}>保存配置</button>
          <button className="chip-btn" onClick={loadConfig}>读取配置</button>
          <button className="chip-btn border-emerald-500/60 hover:bg-emerald-500/20" onClick={runSim}>模拟 200 局</button>
          <button className="chip-btn border-zinc-500" onClick={() => setRaw(JSON.stringify(DEFAULT_BALANCE, null, 2))}>恢复默认</button>
        </div>
        {msg && <p className="mt-2 text-xs text-cyan-300">{msg}</p>}
      </section>

      <section className="panel p-4">
        <h2 className="text-base font-semibold">模拟结果</h2>
        {!sim ? (
          <p className="mt-2 text-sm text-zinc-400">尚未模拟。</p>
        ) : (
          <div className="mt-2 grid gap-2 text-sm md:grid-cols-5">
            <p>局数：{sim.rounds}</p>
            <p>玩家胜：{sim.player}</p>
            <p>AI 胜：{sim.ai}</p>
            <p>平局：{sim.draw}</p>
            <p>玩家胜率：{(sim.playerWinRate * 100).toFixed(1)}%</p>
          </div>
        )}
      </section>
    </main>
  );
}
