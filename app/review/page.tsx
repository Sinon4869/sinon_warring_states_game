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

type VersionCompareResp = {
  versions: string[];
  left: { version: string; matches: number; playerWinRate: number; avgTurns: number; drawRate: number };
  right: { version: string; matches: number; playerWinRate: number; avgTurns: number; drawRate: number };
  delta: { matches: number; playerWinRate: number; avgTurns: number; drawRate: number };
  risk: 'low' | 'medium' | 'high';
};

type RetentionResp = {
  total: number;
  policy: { hotLimit: number; keepDays: number; sample: Record<string, number> };
};

type BattleQualityResp = {
  sampleSize: number;
  metrics: { drawRate: number; apmLike: number; avgTickMs: number; avgLagSpikes: number; avgFxPeak: number };
  scores: { readability: number; hitFeel: number; learningCost: number; overall: number };
  suggestions: string[];
};

export default function ReviewPage() {
  const [data, setData] = useState<SummaryResp | null>(null);
  const [aiAudit, setAiAudit] = useState<AiAuditResp | null>(null);
  const [pveDiff, setPveDiff] = useState<PveDiffResp | null>(null);
  const [versionCompare, setVersionCompare] = useState<VersionCompareResp | null>(null);
  const [retention, setRetention] = useState<RetentionResp | null>(null);
  const [battleQuality, setBattleQuality] = useState<BattleQualityResp | null>(null);
  const [retentionMsg, setRetentionMsg] = useState('');

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

    fetch('/api/review/version-compare')
      .then((r) => r.json())
      .then((d) => setVersionCompare(d))
      .catch(() => setVersionCompare(null));

    fetch('/api/review/retention')
      .then((r) => r.json())
      .then((d) => setRetention(d))
      .catch(() => setRetention(null));

    fetch('/api/review/battle-quality')
      .then((r) => r.json())
      .then((d) => setBattleQuality(d))
      .catch(() => setBattleQuality(null));
  }, []);

  async function runCleanup() {
    const res = await fetch('/api/review/retention', { method: 'POST' });
    const data = await res.json();
    setRetentionMsg(`清理完成：${data.before} -> ${data.after}（移除 ${data.removed}）`);
    const latest = await fetch('/api/review/retention').then((r) => r.json()).catch(() => null);
    setRetention(latest);
  }

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

          <section className="panel p-4">
            <h2 className="mb-2 text-base font-semibold">版本对比 Review（A/B）</h2>
            {!versionCompare ? (
              <p className="text-sm text-zinc-400">暂无版本对比数据</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p>Left: {versionCompare.left.version}（{versionCompare.left.matches} 场） / Right: {versionCompare.right.version}（{versionCompare.right.matches} 场）</p>
                <p>玩家胜率变化：{(versionCompare.delta.playerWinRate * 100).toFixed(1)}% · 平均时长变化：{versionCompare.delta.avgTurns}s · 平局率变化：{(versionCompare.delta.drawRate * 100).toFixed(1)}%</p>
                <p className={versionCompare.risk === 'low' ? 'text-emerald-300' : versionCompare.risk === 'medium' ? 'text-amber-300' : 'text-rose-300'}>
                  回归风险：{versionCompare.risk}
                </p>
              </div>
            )}
          </section>

          <section className="panel p-4">
            <h2 className="mb-2 text-base font-semibold">战斗体验质量 Review</h2>
            {!battleQuality ? (
              <p className="text-sm text-zinc-400">暂无战斗质量数据</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p>样本：{battleQuality.sampleSize} 场 · 平局率：{(battleQuality.metrics.drawRate * 100).toFixed(1)}% · 操作密度(APM-like)：{battleQuality.metrics.apmLike}</p>
                <p>性能：avgTick {battleQuality.metrics.avgTickMs}ms · lagSpikes {battleQuality.metrics.avgLagSpikes} · fxPeak {battleQuality.metrics.avgFxPeak}</p>
                <div className="grid gap-2 md:grid-cols-4">
                  <p className="rounded border border-zinc-700 bg-zinc-900/60 px-3 py-2">可读性：{battleQuality.scores.readability}</p>
                  <p className="rounded border border-zinc-700 bg-zinc-900/60 px-3 py-2">打击感：{battleQuality.scores.hitFeel}</p>
                  <p className="rounded border border-zinc-700 bg-zinc-900/60 px-3 py-2">学习成本：{battleQuality.scores.learningCost}</p>
                  <p className="rounded border border-cyan-500/40 bg-cyan-900/20 px-3 py-2 text-cyan-300">综合：{battleQuality.scores.overall}</p>
                </div>
                <div className="space-y-1 text-xs text-zinc-300">
                  {battleQuality.suggestions.map((s, i) => (
                    <p key={`${s}-${i}`}>- {s}</p>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="panel p-4">
            <h2 className="mb-2 text-base font-semibold">Review 导出</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              <a href="/api/review/export?format=json" className="chip-btn" target="_blank">导出 JSON</a>
              <a href="/api/review/export?format=markdown" className="chip-btn" target="_blank">导出 Markdown</a>
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="mb-2 text-base font-semibold">数据保留与清理策略</h2>
            {!retention ? (
              <p className="text-sm text-zinc-400">暂无策略数据</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p>当前事件数：{retention.total}</p>
                <p>热数据上限：{retention.policy.hotLimit} · 保留天数：{retention.policy.keepDays}</p>
                <p className="text-xs text-zinc-400">采样：{Object.entries(retention.policy.sample).map(([k, v]) => `${k}/每${v}条保留1条`).join('；')}</p>
                <button onClick={runCleanup} className="chip-btn">执行清理</button>
                {retentionMsg && <p className="text-xs text-cyan-300">{retentionMsg}</p>}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
