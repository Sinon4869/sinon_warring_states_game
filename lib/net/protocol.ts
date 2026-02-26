export type SyncCommand =
  | { type: 'deploy'; lane: 0 | 1 | 2; cardId: string; ts: number }
  | { type: 'skill'; lane: 0 | 1 | 2; skillId: string; ts: number }
  | { type: 'pause'; ts: number }
  | { type: 'resume'; ts: number }
  | { type: 'ping'; ts: number };

export type SyncEvent =
  | { type: 'state'; tick: number; hash: string }
  | { type: 'ack'; ts: number }
  | { type: 'reject'; reason: string; ts: number }
  | { type: 'pong'; ts: number };

export function validateCommand(input: unknown): { ok: true; cmd: SyncCommand } | { ok: false; reason: string } {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'invalid_payload' };
  const v = input as Partial<SyncCommand>;
  if (!v.type || typeof v.ts !== 'number') return { ok: false, reason: 'missing_type_or_ts' };

  if (v.type === 'deploy') {
    if (typeof v.cardId !== 'string') return { ok: false, reason: 'invalid_card' };
    if (v.lane !== 0 && v.lane !== 1 && v.lane !== 2) return { ok: false, reason: 'invalid_lane' };
    return { ok: true, cmd: v as SyncCommand };
  }

  if (v.type === 'skill') {
    if (typeof v.skillId !== 'string') return { ok: false, reason: 'invalid_skill' };
    if (v.lane !== 0 && v.lane !== 1 && v.lane !== 2) return { ok: false, reason: 'invalid_lane' };
    return { ok: true, cmd: v as SyncCommand };
  }

  if (v.type === 'pause' || v.type === 'resume' || v.type === 'ping') return { ok: true, cmd: v as SyncCommand };

  return { ok: false, reason: 'unknown_type' };
}
