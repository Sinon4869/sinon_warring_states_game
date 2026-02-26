import { type CampaignState, type Command, type MachineState } from '@/lib/game/types';

export const INITIAL_CAMPAIGN: CampaignState = {
  turn: 1,
  year: 1560,
  pop: 100,
  food: 120,
  gold: 120,
  army: 80,
  order: 70,
  prestige: 30,
  land: 1,
  enemyLand: 9,
  logs: ['开局：你在乱世中占据一隅之地。']
};

function clamp(v: number, min = 0, max = 9999) {
  return Math.max(min, Math.min(max, v));
}

export function createMachineState(seed?: Partial<CampaignState>): MachineState {
  return {
    phase: 'running',
    tick: 0,
    queued: [],
    campaign: { ...INITIAL_CAMPAIGN, ...(seed || {}) }
  };
}

export function queueCommand(state: MachineState, cmd: Command): MachineState {
  return { ...state, queued: [...state.queued, cmd] };
}

function applyAction(campaign: CampaignState, type: Command['type']) {
  const s = { ...campaign };
  if (type === 'farm') {
    s.food += 24;
    s.pop += 3;
    s.order += 1;
  } else if (type === 'trade') {
    s.gold += 28;
    s.pop += 2;
  } else if (type === 'recruit') {
    s.army += 18;
    s.gold -= 22;
    s.order -= 2;
  } else if (type === 'pacify') {
    s.order += 8;
    s.gold -= 10;
  } else if (type === 'diplomacy') {
    s.prestige += 6;
    s.gold -= 8;
  }

  s.pop = clamp(s.pop, 0, 999);
  s.food = clamp(s.food, 0, 999);
  s.gold = clamp(s.gold, 0, 999);
  s.army = clamp(s.army, 0, 999);
  s.order = clamp(s.order, 0, 100);
  s.prestige = clamp(s.prestige, 0, 100);
  return s;
}

export function settleTurn(campaign: CampaignState): CampaignState {
  const next = { ...campaign };
  next.food = clamp(next.food + Math.floor(next.pop * 0.08) - Math.floor(next.army * 0.05));
  next.gold = clamp(next.gold + Math.floor(next.pop * 0.07) + Math.floor(next.land * 5));
  if (next.food < 30) {
    next.pop = clamp(next.pop - 8, 0, 999);
    next.order = clamp(next.order - 7, 0, 100);
  }
  next.turn += 1;
  if (next.turn % 4 === 1) next.year += 1;
  next.logs = [`结算：回合推进至 ${next.year} 年`, ...next.logs].slice(0, 30);
  return next;
}

export function tickMachine(state: MachineState): MachineState {
  if (state.phase === 'end') return state;

  const commands = state.queued.filter((c) => c.atTick <= state.tick);
  let campaign = { ...state.campaign };

  for (const cmd of commands) {
    if (cmd.type === 'end_turn') {
      campaign = settleTurn(campaign);
    } else {
      campaign = applyAction(campaign, cmd.type);
      campaign.logs = [`第${campaign.turn}回合执行：${cmd.type}`, ...campaign.logs].slice(0, 30);
    }
  }

  const nextPhase = campaign.land >= 10 || campaign.pop <= 0 || campaign.order <= 0 || campaign.food <= 0 ? 'end' : 'running';
  return {
    ...state,
    phase: nextPhase,
    tick: state.tick + 1,
    campaign,
    queued: state.queued.filter((c) => c.atTick > state.tick)
  };
}
