import { NextResponse } from 'next/server';

import { buildMatchHeatmap, buildMatchTimeline } from '@/lib/review/metrics';

type EventItem = { name: string; at: number; props?: Record<string, unknown> };

const globalStore = globalThis as typeof globalThis & { __swsTelemetry?: EventItem[] };
if (!globalStore.__swsTelemetry) globalStore.__swsTelemetry = [];

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const events = globalStore.__swsTelemetry || [];
  return NextResponse.json({
    ok: true,
    timeline: buildMatchTimeline(events, id),
    heatmap: buildMatchHeatmap(events, id)
  });
}
