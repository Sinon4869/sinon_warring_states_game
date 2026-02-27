import { NextResponse } from 'next/server';

import { applyRetention, buildRetentionStats, RETENTION_POLICY } from '@/lib/review/retention';

type EventItem = { name: string; at: number; props?: Record<string, unknown> };

const globalStore = globalThis as typeof globalThis & { __swsTelemetry?: EventItem[] };
if (!globalStore.__swsTelemetry) globalStore.__swsTelemetry = [];

export async function GET() {
  const events = globalStore.__swsTelemetry || [];
  return NextResponse.json({ ok: true, total: events.length, policy: RETENTION_POLICY });
}

export async function POST() {
  const before = [...(globalStore.__swsTelemetry || [])];
  const after = applyRetention(before);
  globalStore.__swsTelemetry = after;
  return NextResponse.json({ ok: true, ...buildRetentionStats(before, after) });
}
