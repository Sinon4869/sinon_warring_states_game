import { NextResponse } from 'next/server';

type EventItem = { name: string; at: number; props?: Record<string, unknown> };

const globalStore = globalThis as typeof globalThis & { __swsTelemetry?: EventItem[] };
if (!globalStore.__swsTelemetry) globalStore.__swsTelemetry = [];

export async function GET() {
  const events = (globalStore.__swsTelemetry || []).filter((e) => e.name === 'battle_perf_summary');
  const n = events.length || 1;
  const avgTickMs = Math.round(events.reduce((a, b) => a + Number(b.props?.avgTickMs ?? 100), 0) / n);
  const avgLagSpikes = Number((events.reduce((a, b) => a + Number(b.props?.lagSpikes ?? 0), 0) / n).toFixed(2));
  const avgFxPeak = Number((events.reduce((a, b) => a + Number(b.props?.fxPeak ?? 0), 0) / n).toFixed(2));

  return NextResponse.json({
    ok: true,
    sample: events.length,
    avgTickMs,
    avgLagSpikes,
    avgFxPeak,
    quality: avgTickMs <= 120 && avgLagSpikes <= 3 ? 'stable' : avgTickMs <= 150 ? 'medium' : 'poor'
  });
}
