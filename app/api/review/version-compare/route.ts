import { NextResponse } from 'next/server';

import { buildVersionCompare } from '@/lib/review/metrics';

type EventItem = { name: string; at: number; props?: Record<string, unknown> };

const globalStore = globalThis as typeof globalThis & { __swsTelemetry?: EventItem[] };
if (!globalStore.__swsTelemetry) globalStore.__swsTelemetry = [];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const left = url.searchParams.get('left') ?? undefined;
  const right = url.searchParams.get('right') ?? undefined;
  const events = globalStore.__swsTelemetry || [];
  return NextResponse.json({ ok: true, ...buildVersionCompare(events, left, right) });
}
