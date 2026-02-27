'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SummaryResp = {
  kpi: {
    totalMatches: number;
    playerWinRate: number;
    aiWinRate: number;
    avgTurns: number;
    avgDeploys: number;
  };
  matches: Array<{
    matchId: string;
    mode: string;
    stage?: string;
    winner: string;
    turnsUsed: number;
    deploys: number;
    towerHits: number;
    coreHits: number;
    endedAt: number;
  }>;
};

export default function ReviewPage() {
  const [data, setData] = useState<SummaryResp | null>(null);

  useEffect(() => {
    fetch('/api/review/summary')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null));
  }, []);

  return (
    <main className="app-shell text-zinc-100">
      <header className="panel flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">REVIEW CENTER</p>
          <h1 className="panel-title">全面复盘中心</h1>
        </div>
        <Link href="/" className="text-sm text-cyan-300 hover:underline">首页</Link>
      </header>

      {!data ? (
        <section className="panel p-4 text-sm text-zinc-400">暂无复盘数据</section>
      ) : (
        <>
          <section className="panel grid gap-2 p-4 md:grid-cols-5">
            <article className="rounded border border-zinc-700 p-2 text-sm">场次：{data.kpi.totalMatches}</article>
            <article className="rounded border border-zinc-700 p-2 text-sm">玩家胜率：{(data.kpi.playerWinRate * 100).toFixed(1)}%</article>
            <article className="rounded border border-zinc-700 p-2 text-sm">AI胜率：{(data.kpi.aiWinRate * 100).toFixed(1)}%</article>
            <article className="rounded border border-zinc-700 p-2 text-sm">平均时长：{data.kpi.avgTurns}s</article>
            <article className="rounded border border-zinc-700 p-2 text-sm">场均操作：{data.kpi.avgDeploys}</article>
          </section>

          <section className="panel p-4">
            <h2 className="mb-2 text-base font-semibold">最近对局</h2>
            <div className="space-y-2">
              {data.matches.map((m) => (
                <div key={m.matchId} className="rounded border border-zinc-700 bg-zinc-900/50 p-3 text-sm">
                  <p>{m.matchId} · {m.mode} · {m.stage ?? '标准'}</p>
                  <p className="text-zinc-400">胜者: {m.winner} · 时长: {m.turnsUsed}s · deploy: {m.deploys} · 塔击中: {m.towerHits} · 本阵击中: {m.coreHits}</p>
                  <Link href={`/review/${m.matchId}`} className="text-cyan-300 hover:underline">查看时间线/热力图</Link>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
