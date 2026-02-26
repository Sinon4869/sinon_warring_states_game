import { NextResponse } from 'next/server';

import { DEFAULT_BALANCE, type BalanceConfig } from '@/lib/game/balance';

function oneMatch(cfg: BalanceConfig) {
  const p = cfg.units.reduce((a, u) => a + (u.hp * 0.4 + u.atk * 1.2 + u.speed * 0.8) / Math.max(1, u.cost), 0);
  const ai = cfg.units.reduce((a, u) => a + (u.hp * 0.35 + u.atk * 1.25 + u.range * 0.6) / Math.max(1, u.cost), 0) + Math.random() * 8;
  if (Math.abs(p - ai) < 3) return 'draw';
  return p > ai ? 'player' : 'ai';
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { config?: BalanceConfig; rounds?: number };
  const cfg = body.config ?? DEFAULT_BALANCE;
  const rounds = Math.max(20, Math.min(500, body.rounds ?? 100));

  let player = 0;
  let ai = 0;
  let draw = 0;
  for (let i = 0; i < rounds; i += 1) {
    const r = oneMatch(cfg);
    if (r === 'player') player += 1;
    else if (r === 'ai') ai += 1;
    else draw += 1;
  }

  return NextResponse.json({ ok: true, rounds, player, ai, draw, playerWinRate: Number((player / rounds).toFixed(3)) });
}
