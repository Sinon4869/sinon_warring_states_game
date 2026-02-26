import { NextResponse } from 'next/server';

import { validateCommand } from '@/lib/net/protocol';

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const checked = validateCommand(payload);
  if (!checked.ok) {
    return NextResponse.json({ ok: false, reason: checked.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true, command: checked.cmd });
}
