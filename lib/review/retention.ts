type EventItem = { name: string; at: number; props?: Record<string, unknown> };

export const RETENTION_POLICY = {
  hotLimit: 2000,
  keepDays: 14,
  sample: {
    battle_deploy: 2,
    battle_tower_hit: 1,
    battle_core_hit: 1,
    battle_ai_decision: 1
  }
} as const;

function shouldKeepBySampling(e: EventItem, index: number) {
  const n = RETENTION_POLICY.sample[e.name as keyof typeof RETENTION_POLICY.sample];
  if (!n) return true;
  return index % n === 0;
}

export function applyRetention(events: EventItem[]) {
  const now = Date.now();
  const minAt = now - RETENTION_POLICY.keepDays * 24 * 60 * 60 * 1000;

  let filtered = events.filter((e) => e.at >= minAt);
  filtered = filtered.filter((e, idx) => shouldKeepBySampling(e, idx));
  if (filtered.length > RETENTION_POLICY.hotLimit) {
    filtered = filtered.slice(-RETENTION_POLICY.hotLimit);
  }

  return filtered;
}

export function buildRetentionStats(before: EventItem[], after: EventItem[]) {
  return {
    before: before.length,
    after: after.length,
    removed: Math.max(0, before.length - after.length),
    policy: RETENTION_POLICY
  };
}
