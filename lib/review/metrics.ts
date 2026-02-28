type EventItem = { name: string; at: number; props?: Record<string, unknown> };

type MatchSummary = {
  matchId: string;
  mode: string;
  stage?: string;
  winner: string;
  turnsUsed: number;
  deploys: number;
  towerHits: number;
  coreHits: number;
  startedAt: number;
  endedAt: number;
};

function toNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function buildReviewSummary(events: EventItem[]) {
  const withMatch = events.filter((e) => typeof e.props?.matchId === 'string') as Array<EventItem & { props: Record<string, unknown> }>;
  const byMatch = new Map<string, EventItem[]>();
  for (const e of withMatch) {
    const id = String(e.props.matchId);
    byMatch.set(id, [...(byMatch.get(id) ?? []), e]);
  }

  const matches: MatchSummary[] = [];

  for (const [matchId, list] of byMatch.entries()) {
    const sorted = [...list].sort((a, b) => a.at - b.at);
    const result = sorted.findLast((e) => e.name === 'battle_result');
    if (!result) continue;

    const deploys = sorted.filter((e) => e.name === 'battle_deploy').length;
    const towerHits = sorted.filter((e) => e.name === 'battle_tower_hit').length;
    const coreHits = sorted.filter((e) => e.name === 'battle_core_hit').length;

    matches.push({
      matchId,
      mode: String(result.props?.mode ?? 'normal'),
      stage: result.props?.stage ? String(result.props.stage) : undefined,
      winner: String(result.props?.winner ?? 'draw'),
      turnsUsed: toNum(result.props?.turnsUsed),
      deploys,
      towerHits,
      coreHits,
      startedAt: sorted[0].at,
      endedAt: result.at
    });
  }

  const recent = matches.sort((a, b) => b.endedAt - a.endedAt).slice(0, 20);
  const n = Math.max(1, recent.length);
  const playerWinRate = recent.filter((m) => m.winner === 'player').length / n;
  const aiWinRate = recent.filter((m) => m.winner === 'ai').length / n;
  const avgTurns = Math.round(recent.reduce((a, b) => a + b.turnsUsed, 0) / n);

  return {
    kpi: {
      totalMatches: recent.length,
      playerWinRate,
      aiWinRate,
      avgTurns,
      avgDeploys: Number((recent.reduce((a, b) => a + b.deploys, 0) / n).toFixed(2))
    },
    matches: recent
  };
}

export function buildMatchTimeline(events: EventItem[], matchId: string) {
  return events
    .filter((e) => e.props?.matchId === matchId)
    .sort((a, b) => a.at - b.at)
    .map((e) => ({
      at: e.at,
      name: e.name,
      lane: toNum(e.props?.lane, -1),
      by: e.props?.by ? String(e.props.by) : undefined,
      damage: toNum(e.props?.damage, 0),
      troop: e.props?.troop ? String(e.props.troop) : undefined
    }));
}

export function buildMatchHeatmap(events: EventItem[], matchId: string) {
  const timeline = buildMatchTimeline(events, matchId);
  if (timeline.length === 0) return { buckets: [] as Array<{ second: number; lane0: number; lane1: number; lane2: number }> };
  const start = timeline[0].at;
  const map = new Map<number, [number, number, number]>();

  for (const e of timeline) {
    const lane = e.lane;
    if (lane < 0 || lane > 2) continue;
    const second = Math.max(0, Math.floor((e.at - start) / 1000));
    const value = e.name === 'battle_deploy' ? 2 : e.name === 'battle_tower_hit' ? 3 : e.name === 'battle_core_hit' ? 5 : 1;
    const row = map.get(second) ?? [0, 0, 0];
    row[lane] += value;
    map.set(second, row);
  }

  return {
    buckets: [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([second, row]) => ({ second, lane0: row[0], lane1: row[1], lane2: row[2] }))
  };
}

export function buildAiDecisionAudit(events: EventItem[]) {
  const decisions = events.filter((e) => e.name === 'battle_ai_decision');
  const byPersona: Record<string, { total: number; reasons: Record<string, number> }> = {};

  for (const d of decisions) {
    const persona = String(d.props?.persona ?? 'unknown');
    const reason = String(d.props?.reason ?? 'unknown');
    if (!byPersona[persona]) byPersona[persona] = { total: 0, reasons: {} };
    byPersona[persona].total += 1;
    byPersona[persona].reasons[reason] = (byPersona[persona].reasons[reason] ?? 0) + 1;
  }

  return {
    total: decisions.length,
    byPersona,
    latest: decisions.slice(-30).reverse().map((d) => ({
      at: d.at,
      matchId: String(d.props?.matchId ?? ''),
      persona: String(d.props?.persona ?? ''),
      reason: String(d.props?.reason ?? ''),
      lane: toNum(d.props?.lane, -1),
      troop: String(d.props?.troop ?? '')
    }))
  };
}

export function buildPveDifficultyReview(events: EventItem[]) {
  const results = events.filter((e) => e.name === 'battle_result' && e.props?.mode === 'pve');
  const byStage = new Map<string, { total: number; wins: number; avgTurns: number; failReasons: Record<string, number> }>();

  for (const r of results) {
    const stage = String(r.props?.stage ?? 'unknown');
    const winner = String(r.props?.winner ?? 'draw');
    const turns = toNum(r.props?.turnsUsed, 0);
    const row = byStage.get(stage) ?? { total: 0, wins: 0, avgTurns: 0, failReasons: {} };
    row.total += 1;
    if (winner === 'player') row.wins += 1;
    row.avgTurns += turns;
    if (winner !== 'player') {
      const reason = winner === 'ai' ? '被AI击败' : '平局超时';
      row.failReasons[reason] = (row.failReasons[reason] ?? 0) + 1;
    }
    byStage.set(stage, row);
  }

  const stages = [...byStage.entries()].map(([stage, v]) => {
    const clearRate = v.total ? v.wins / v.total : 0;
    const avgTurns = v.total ? Math.round(v.avgTurns / v.total) : 0;
    const difficultyFlag = clearRate < 0.28 ? '过难' : clearRate > 0.78 ? '过易' : '正常';
    return { stage, total: v.total, clearRate, avgTurns, failReasons: v.failReasons, difficultyFlag };
  });

  return { totalPveMatches: results.length, stages };
}

export function buildVersionCompare(events: EventItem[], left?: string, right?: string) {
  const results = events.filter((e) => e.name === 'battle_result');
  const versions = [...new Set(results.map((r) => String(r.props?.version ?? 'dev')))].slice(-12);

  const calc = (version: string) => {
    const rows = results.filter((r) => String(r.props?.version ?? 'dev') === version);
    const n = rows.length || 1;
    const playerWinRate = rows.filter((r) => String(r.props?.winner) === 'player').length / n;
    const avgTurns = Math.round(rows.reduce((a, b) => a + toNum(b.props?.turnsUsed, 0), 0) / n);
    const drawRate = rows.filter((r) => String(r.props?.winner) === 'draw').length / n;
    return { version, matches: rows.length, playerWinRate, avgTurns, drawRate };
  };

  const lv = left && versions.includes(left) ? left : versions[versions.length - 2] ?? versions[0] ?? 'dev';
  const rv = right && versions.includes(right) ? right : versions[versions.length - 1] ?? 'dev';
  const l = calc(lv);
  const r = calc(rv);

  const delta = {
    matches: r.matches - l.matches,
    playerWinRate: Number((r.playerWinRate - l.playerWinRate).toFixed(4)),
    avgTurns: r.avgTurns - l.avgTurns,
    drawRate: Number((r.drawRate - l.drawRate).toFixed(4))
  };

  const risk = Math.abs(delta.playerWinRate) > 0.2 || Math.abs(delta.avgTurns) > 18 ? 'high' : Math.abs(delta.playerWinRate) > 0.1 ? 'medium' : 'low';

  return { versions, left: l, right: r, delta, risk };
}

export function buildMapOpsReview(events: EventItem[]) {
  const mapActions = events.filter((e) => e.name === 'map_action');
  const enemyActions = events.filter((e) => e.name === 'map_enemy_action');
  const campaignResults = events.filter((e) => e.name === 'battle_result' && e.props?.mode === 'campaign');

  const byRegion: Record<string, { actions: number; wins: number; losses: number; draws: number; supplyBlocked: number }> = {};
  for (const a of mapActions) {
    const rid = String(a.props?.regionId ?? 'unknown');
    if (!byRegion[rid]) byRegion[rid] = { actions: 0, wins: 0, losses: 0, draws: 0, supplyBlocked: 0 };
    byRegion[rid].actions += 1;
    if (a.props?.supplyOk === false) byRegion[rid].supplyBlocked += 1;
  }

  for (const r of campaignResults) {
    const rid = String(r.props?.regionId ?? 'unknown');
    if (!byRegion[rid]) byRegion[rid] = { actions: 0, wins: 0, losses: 0, draws: 0, supplyBlocked: 0 };
    const w = String(r.props?.winner ?? 'draw');
    if (w === 'player') byRegion[rid].wins += 1;
    else if (w === 'ai') byRegion[rid].losses += 1;
    else byRegion[rid].draws += 1;
  }

  const regions = Object.entries(byRegion)
    .map(([regionId, v]) => ({ regionId, ...v, winRate: v.wins / Math.max(1, v.wins + v.losses + v.draws) }))
    .sort((a, b) => b.actions - a.actions)
    .slice(0, 15);

  return {
    totalMapActions: mapActions.length,
    enemyActions: enemyActions.length,
    supplyInterrupted: mapActions.filter((e) => e.props?.supplyOk === false).length,
    regions
  };
}

export function buildBattleQualityReview(events: EventItem[]) {
  const summary = buildReviewSummary(events);
  const perfRows = events.filter((e) => e.name === 'battle_perf_summary');
  const recent = summary.matches.slice(0, 30);
  const n = Math.max(1, recent.length);

  const drawRate = recent.filter((m) => m.winner === 'draw').length / n;
  const avgDeploys = recent.reduce((a, b) => a + b.deploys, 0) / n;
  const avgTurns = recent.reduce((a, b) => a + b.turnsUsed, 0) / n;
  const apmLike = Number((avgDeploys / Math.max(1, avgTurns / 60)).toFixed(2));

  const pN = Math.max(1, perfRows.length);
  const avgTickMs = Math.round(perfRows.reduce((a, b) => a + toNum(b.props?.avgTickMs, 100), 0) / pN);
  const avgLagSpikes = Number((perfRows.reduce((a, b) => a + toNum(b.props?.lagSpikes, 0), 0) / pN).toFixed(2));
  const avgFxPeak = Number((perfRows.reduce((a, b) => a + toNum(b.props?.fxPeak, 0), 0) / pN).toFixed(2));

  const readabilityScore = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, avgFxPeak - 26) * 2.3 - Math.max(0, avgTickMs - 120) * 0.28)));
  const hitFeelScore = Math.max(0, Math.min(100, Math.round(55 + Math.min(30, recent.reduce((a, b) => a + b.coreHits + b.towerHits, 0) / n) - drawRate * 18)));
  const learningCostScore = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, apmLike - 13) * 4 - drawRate * 30)));

  const suggestions: string[] = [];
  if (drawRate > 0.22) suggestions.push('平局率偏高：继续加强终局收敛（加时攻速/塔伤）。');
  if (apmLike > 14) suggestions.push('操作密度偏高：提高自动投放优先级并缩减必须手操频次。');
  if (avgTickMs > 130 || avgLagSpikes > 2.5) suggestions.push('性能压力偏高：进一步降低低端档特效上限与动画复杂度。');
  if (avgFxPeak > 30) suggestions.push('特效拥挤：减少同屏飘字，优先保留关键事件。');
  if (suggestions.length === 0) suggestions.push('当前战斗可读性与负担处于可接受区间，可继续迭代美术质量。');

  return {
    sampleSize: recent.length,
    metrics: {
      drawRate: Number(drawRate.toFixed(4)),
      apmLike,
      avgTickMs,
      avgLagSpikes,
      avgFxPeak
    },
    scores: {
      readability: readabilityScore,
      hitFeel: hitFeelScore,
      learningCost: learningCostScore,
      overall: Math.round((readabilityScore + hitFeelScore + learningCostScore) / 3)
    },
    suggestions
  };
}
