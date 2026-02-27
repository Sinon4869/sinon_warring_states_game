export type PlayabilityReport = {
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

type BattleResultEvent = {
  name: string;
  props?: Record<string, unknown>;
};

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}

export function buildPlayabilityReport(events: BattleResultEvent[]): PlayabilityReport {
  const results = events.filter((e) => e.name === 'battle_result');
  const deploys = events.filter((e) => e.name === 'battle_deploy');

  const durations = results.map((e) => Number(e.props?.turnsUsed ?? 0)).filter((n) => Number.isFinite(n) && n > 0);
  const winners = results.map((e) => String(e.props?.winner ?? 'draw'));

  const sampleSize = results.length;
  const playerWins = winners.filter((w) => w === 'player').length;
  const aiWins = winners.filter((w) => w === 'ai').length;
  const draws = winners.filter((w) => w === 'draw').length;

  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const p50Duration = Math.round(percentile(durations, 0.5));

  const playerWinRate = sampleSize ? playerWins / sampleSize : 0;
  const aiWinRate = sampleSize ? aiWins / sampleSize : 0;
  const drawRate = sampleSize ? draws / sampleSize : 0;
  const avgDeployPerMatch = sampleSize ? Number((deploys.length / sampleSize).toFixed(2)) : 0;

  const reasons: string[] = [];
  if (sampleSize < 8) reasons.push('样本不足（至少 8 场）');
  if (avgDuration > 95 || avgDuration < 35) reasons.push('平均战斗时长不在理想区间（35~95s）');
  if (Math.abs(playerWinRate - aiWinRate) > 0.35) reasons.push('胜率差过大，平衡性偏移');
  if (avgDeployPerMatch < 12) reasons.push('操作频次偏低，交互张力不足');

  return {
    sampleSize,
    avgDuration,
    p50Duration,
    playerWinRate,
    aiWinRate,
    drawRate,
    avgDeployPerMatch,
    pass: reasons.length === 0,
    reasons
  };
}
