import { NextResponse } from 'next/server';

import { buildReviewExport, toMarkdownReport } from '@/lib/review/export';

type EventItem = { name: string; at: number; props?: Record<string, unknown> };

const globalStore = globalThis as typeof globalThis & { __swsTelemetry?: EventItem[] };
if (!globalStore.__swsTelemetry) globalStore.__swsTelemetry = [];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') ?? 'json';
  const data = buildReviewExport(globalStore.__swsTelemetry || []);

  if (format === 'markdown') {
    const md = toMarkdownReport(data);
    return new NextResponse(md, {
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        'content-disposition': 'attachment; filename="review-report.md"'
      }
    });
  }

  return NextResponse.json({ ok: true, ...data });
}
