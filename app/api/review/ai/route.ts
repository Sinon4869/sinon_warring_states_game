import { NextResponse } from 'next/server';

import { buildAiDecisionAudit } from '@/lib/review/metrics';

type EventItem = { name: string; at: number; props?: Record<string, unknown> };

const globalStore = globalThis as typeof globalThis & { __swsTelemetry?: EventItem[] };
if (!globalStore.__swsTelemetry) globalStore.__swsTelemetry = [];

export async function GET() {
  const events = globalStore.__swsTelemetry || [];
  return NextResponse.json({ ok: true, ...buildAiDecisionAudit(events) });
}
