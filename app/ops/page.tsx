'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Summary = {
  total: number;
  byName: Record<string, number>;
  latest: Array<{ name: string; at: number }>;
};

type Playability = {
  sampleSize: number;
  avgDuration: number;
  p50Duration: number;
  playerWinRate: number;
  aiWinRate: number;
  drawRate: number;
  avgDeployPerMatch: number;
  pass: boolean;
  reasons: string[];
};

export default function OpsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [playability, setPlayability] = useState<Playability | null>(null);

  useEffect(() => {
    fetch('/api/telemetry')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null));

    fetch('/api/game/playability')
      .then((r) => r.json())
      .then((d) => setPlayability(d.report ?? null))
      .catch(() => setPlayability(null));
  }, []);

  return (
    <main className="app-shell text-zinc-100">
      <header className="panel flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">OPS</p>
          <h1 className="panel-title">可观测性与事件面板</h1>
        </div>
        <Link href="/" className="text-sm text-cyan-300 hover:underline">首页</Link>
      </header>

      <section className="panel p-4">
        {!data ? (
          <p className="text-sm text-zinc-400">暂无数据</p>
        ) : (
          <>
            <p className="text-sm">总事件数：{data.total}</p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {Object.entries(data.byName).map(([k, v]) => (
                <div key={k} className="rounded border border-zinc-700 p-2 text-sm">
                  {k}: {v}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel p-4">
        <h2 className="text-base font-semibold">对战可玩性报告</h2>
        {!playability ? (
          <p className="mt-2 text-sm text-zinc-400">暂无报告</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm">
            <p>样本场次：{playability.sampleSize}</p>
            <p>平均时长：{playability.avgDuration}s（P50: {playability.p50Duration}s）</p>
            <p>胜率分布：玩家 {(playability.playerWinRate * 100).toFixed(1)}% / AI {(playability.aiWinRate * 100).toFixed(1)}% / 平局 {(playability.drawRate * 100).toFixed(1)}%</p>
            <p>场均操作频次（deploy）：{playability.avgDeployPerMatch}</p>
            <p className={playability.pass ? 'text-emerald-300' : 'text-amber-300'}>
              发布门槛：{playability.pass ? '通过' : '未通过'}
            </p>
            {playability.reasons.length > 0 && (
              <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
                {playability.reasons.map((r) => (
                  <p key={r}>- {r}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
