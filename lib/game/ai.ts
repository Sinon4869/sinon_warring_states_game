import type { UnitBalance } from '@/lib/game/balance';

export type AIPersona = 'aggressive' | 'balanced' | 'defensive';

export type AIDecisionInput = {
  energy: number;
  pressureByLane: number[];
  cards: UnitBalance[];
  persona: AIPersona;
};

export type AIDecision = {
  cardId: string;
  lane: number;
  reason: string;
};

function pickLaneByPersona(pressureByLane: number[], persona: AIPersona) {
  const idxMax = pressureByLane.indexOf(Math.max(...pressureByLane));
  const idxMin = pressureByLane.indexOf(Math.min(...pressureByLane));

  if (persona === 'aggressive') {
    return Math.random() < 0.7 ? idxMin : Math.floor(Math.random() * 3);
  }
  if (persona === 'defensive') {
    return Math.random() < 0.75 ? idxMax : Math.floor(Math.random() * 3);
  }
  return Math.random() < 0.6 ? idxMax : Math.floor(Math.random() * 3);
}

export function decideAIDeploy(input: AIDecisionInput): AIDecision | null {
  const affordable = input.cards.filter((c) => c.cost <= input.energy);
  if (affordable.length === 0) return null;

  const lane = pickLaneByPersona(input.pressureByLane, input.persona);

  const sorted = [...affordable].sort((a, b) => {
    if (input.persona === 'aggressive') return b.atk - a.atk || b.speed - a.speed;
    if (input.persona === 'defensive') return b.hp - a.hp || a.cost - b.cost;
    return (b.atk + b.hp * 0.2) - (a.atk + a.hp * 0.2);
  });

  const chosen = sorted[0];
  const reason =
    input.persona === 'aggressive'
      ? '激进：优先高输出推进'
      : input.persona === 'defensive'
        ? '保守：优先抗线稳场'
        : '均衡：按压力与费用综合决策';

  return { cardId: chosen.id, lane, reason };
}
