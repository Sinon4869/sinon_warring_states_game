import { NextResponse } from 'next/server';

type EventItem = { name: string; at: number; props?: Record<string, unknown> };

const globalStore = globalThis as typeof globalThis & { __swsTelemetry?: EventItem[] };
if (!globalStore.__swsTelemetry) globalStore.__swsTelemetry = [];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as EventItem | null;
  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ ok: false, reason: 'invalid_event' }, { status: 400 });
  }
  globalStore.__swsTelemetry!.push({ name: body.name, at: body.at || Date.now(), props: body.props || {} });
  if (globalStore.__swsTelemetry!.length > 500) globalStore.__swsTelemetry = globalStore.__swsTelemetry!.slice(-500);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const events = globalStore.__swsTelemetry || [];
  const byName: Record<string, number> = {};
  for (const e of events) byName[e.name] = (byName[e.name] || 0) + 1;
  return NextResponse.json({ ok: true, total: events.length, byName, latest: events.slice(-20).reverse() });
}
