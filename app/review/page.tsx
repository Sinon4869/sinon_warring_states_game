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

type AiAuditResp = {
  total: number;
  byPersona: Record<string, { total: number; reasons: Record<string, number> }>;
};

type PveDiffResp = {
  totalPveMatches: number;
  stages: Array<{ stage: string; total: number; clearRate: number; avgTurns: number; difficultyFlag: string }>;
};

export default function ReviewPage() {
  const [data, setData] = useState<SummaryResp | null>(null);
  const [aiAudit, setAiAudit] = useState<AiAuditResp | null>(null);
  const [pveDiff, setPveDiff] = useState<PveDiffResp | null>(null);

  useEffect(() => {
    fetch('/api/review/summary')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null));

    fetch('/api/review/ai')
      .then((r) => r.json())
      .then((d) => setAiAudit(d))
      .catch(() => setAiAudit(null));

    fetch('/api/review/pve-difficulty')
      .then((r) => r.json())
      .then((d) => setPveDiff(d))
      .catch(() => setPveDiff(null));
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

          <section className="panel p-4">
            <h2 className="mb-2 text-base font-semibold">AI 决策审计</h2>
            {!aiAudit ? (
              <p className="text-sm text-zinc-400">暂无 AI 审计数据</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p>总决策事件：{aiAudit.total}</p>
                {Object.entries(aiAudit.byPersona).map(([persona, info]) => (
                  <div key={persona} className="rounded border border-zinc-700 p-2">
                    <p>{persona}：{info.total}</p>
                    <p className="text-xs text-zinc-400">{Object.entries(info.reasons).map(([k, v]) => `${k}:${v}`).join(' / ')}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel p-4">
            <h2 className="mb-2 text-base font-semibold">关卡难度 Review</h2>
            {!pveDiff ? (
              <p className="text-sm text-zinc-400">暂无 PvE 数据</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p>PvE 样本：{pveDiff.totalPveMatches}</p>
                {pveDiff.stages.map((s) => (
                  <div key={s.stage} className="rounded border border-zinc-700 p-2">
                    <p>{s.stage} · 样本{s.total} · 通关率{(s.clearRate * 100).toFixed(1)}% · 平均{s.avgTurns}s</p>
                    <p className={`text-xs ${s.difficultyFlag === '正常' ? 'text-emerald-300' : 'text-amber-300'}`}>难度标记：{s.difficultyFlag}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
