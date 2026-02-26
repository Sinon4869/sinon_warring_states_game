import { NextResponse } from 'next/server';

import { createMachineState, queueCommand, tickMachine } from '@/lib/game/state-machine';
import type { Command, MachineState } from '@/lib/game/types';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    state?: MachineState;
    commands?: Command[];
  };

  let state = body.state ?? createMachineState();
  const commands = body.commands ?? [];

  for (const cmd of commands) {
    state = queueCommand(state, cmd);
  }

  state = tickMachine(state);
  return NextResponse.json({ ok: true, state });
}
