import { buildAiDecisionAudit, buildPveDifficultyReview, buildReviewSummary, buildVersionCompare } from '@/lib/review/metrics';

type EventItem = { name: string; at: number; props?: Record<string, unknown> };

export function buildReviewExport(events: EventItem[]) {
  const summary = buildReviewSummary(events);
  const ai = buildAiDecisionAudit(events);
  const pve = buildPveDifficultyReview(events);
  const version = buildVersionCompare(events);
  const now = new Date().toISOString();

  return { generatedAt: now, summary, ai, pve, version };
}

export function toMarkdownReport(data: ReturnType<typeof buildReviewExport>) {
  const lines: string[] = [];
  lines.push(`# Sinon Warring States - Review Report`);
  lines.push(``);
  lines.push(`GeneratedAt: ${data.generatedAt}`);
  lines.push(``);
  lines.push(`## KPI`);
  lines.push(`- Matches: ${data.summary.kpi.totalMatches}`);
  lines.push(`- Player win rate: ${(data.summary.kpi.playerWinRate * 100).toFixed(1)}%`);
  lines.push(`- AI win rate: ${(data.summary.kpi.aiWinRate * 100).toFixed(1)}%`);
  lines.push(`- Avg turns: ${data.summary.kpi.avgTurns}s`);
  lines.push(`- Avg deploys: ${data.summary.kpi.avgDeploys}`);
  lines.push(``);
  lines.push(`## AI Audit`);
  lines.push(`- Decision events: ${data.ai.total}`);
  for (const [persona, info] of Object.entries(data.ai.byPersona)) {
    lines.push(`- ${persona}: ${info.total} (${Object.entries(info.reasons).map(([k, v]) => `${k}:${v}`).join(' / ')})`);
  }
  lines.push(``);
  lines.push(`## PvE Difficulty`);
  lines.push(`- PvE samples: ${data.pve.totalPveMatches}`);
  for (const s of data.pve.stages) {
    lines.push(`- ${s.stage}: clear ${(s.clearRate * 100).toFixed(1)}%, avg ${s.avgTurns}s, flag=${s.difficultyFlag}`);
  }
  lines.push(``);
  lines.push(`## Version Compare`);
  lines.push(`- Left ${data.version.left.version} (${data.version.left.matches}) vs Right ${data.version.right.version} (${data.version.right.matches})`);
  lines.push(`- Delta win ${(data.version.delta.playerWinRate * 100).toFixed(1)}%, delta turns ${data.version.delta.avgTurns}s, risk=${data.version.risk}`);

  return lines.join('\n');
}
