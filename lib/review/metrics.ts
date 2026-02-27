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
