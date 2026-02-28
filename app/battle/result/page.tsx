'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Settlement = {
  winner: 'player' | 'ai' | 'draw';
  reason: string;
  playerScore: number;
  aiScore: number;
  turnsUsed: number;
  mvpTroop?: string;
  keyLane?: number;
  nextHint?: 'expand' | 'fortify' | 'rest';
  highlights?: string[];
};

export default function BattleResultPage() {
  const [data, setData] = useState<Settlement | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('sws-battle-settlement');
    if (!raw) return;
    try {
      setData(JSON.parse(raw) as Settlement);
    } catch {
      setData(null);
    }
  }, []);

  return (
    <main className="app-shell text-zinc-100">
      <section className="panel overflow-hidden p-0">
        <div className={`px-4 py-4 ${data?.winner === 'player' ? 'bg-gradient-to-r from-emerald-700/50 to-cyan-700/40' : data?.winner === 'ai' ? 'bg-gradient-to-r from-rose-700/50 to-orange-700/30' : 'bg-gradient-to-r from-zinc-700/50 to-slate-700/40'}`}>
          <p className="text-xs tracking-[0.2em] text-cyan-200">BATTLE RESULT</p>
          <h1 className="mt-1 text-2xl font-extrabold">{data?.winner === 'player' ? 'VICTORY' : data?.winner === 'ai' ? 'DEFEAT' : 'DRAW'}</h1>
          <p className="mt-1 text-sm text-zinc-100/90">{data?.reason ?? '战后结算与建议'}</p>
        </div>

        {!data ? (
          <p className="p-4 text-sm text-zinc-400">暂无结算数据</p>
        ) : (
          <div className="space-y-3 p-4 text-sm">
            <div className="grid gap-2 md:grid-cols-4">
              <p className="rounded border border-zinc-700 bg-zinc-900/70 px-3 py-2">积分：我方 {data.playerScore}</p>
              <p className="rounded border border-zinc-700 bg-zinc-900/70 px-3 py-2">敌方：{data.aiScore}</p>
              <p className="rounded border border-zinc-700 bg-zinc-900/70 px-3 py-2">耗时：{data.turnsUsed}s</p>
              <p className="rounded border border-zinc-700 bg-zinc-900/70 px-3 py-2">关键线路：第{(data.keyLane ?? 0) + 1}路</p>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-zinc-950/70 p-3">
              <p className="mb-2 text-xs tracking-[0.16em] text-cyan-300">KEY MOMENTS</p>
              <div className="space-y-2">
                {(data.highlights ?? []).map((h, idx) => (
                  <div key={`${h}-${idx}`} className="rounded border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-zinc-200">
                    <span className="mr-2 text-cyan-300">#{idx + 1}</span>{h}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-3">
              <p>MVP兵种：<span className="font-semibold text-cyan-300">{data.mvpTroop ?? 'N/A'}</span></p>
              <p className="mt-1">建议动作：{data.nextHint === 'expand' ? '扩张追击' : data.nextHint === 'fortify' ? '加固防线' : '休整补给'}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 border-t border-zinc-800 px-4 py-3">
          <Link href="/campaign" className="text-cyan-300 hover:underline">返回战役决策</Link>
          <Link href="/review" className="text-cyan-300 hover:underline">查看复盘中心</Link>
        </div>
      </section>
    </main>
  );
}
