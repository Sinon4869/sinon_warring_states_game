import { NextResponse } from 'next/server';

import { buildBattleQualityReview } from '@/lib/review/metrics';

type EventItem = { name: string; at: number; props?: Record<string, unknown> };

const globalStore = globalThis as typeof globalThis & { __swsTelemetry?: EventItem[] };
if (!globalStore.__swsTelemetry) globalStore.__swsTelemetry = [];

export async function GET() {
  const events = globalStore.__swsTelemetry || [];
  const review = buildBattleQualityReview(events);
  return NextResponse.json({ ok: true, ...review });
}
