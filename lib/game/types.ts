export type Phase = 'lobby' | 'running' | 'settlement' | 'end';

export type CampaignState = {
  turn: number;
  year: number;
  pop: number;
  food: number;
  gold: number;
  army: number;
  order: number;
  prestige: number;
  land: number;
  enemyLand: number;
  logs: string[];
};

export type CommandType = 'farm' | 'trade' | 'recruit' | 'pacify' | 'diplomacy' | 'end_turn';

export type Command = {
  type: CommandType;
  atTick: number;
};

export type MachineState = {
  phase: Phase;
  tick: number;
  campaign: CampaignState;
  queued: Command[];
};

export type BattleWriteback = {
  winner: 'player' | 'ai' | 'draw';
  playerCoreHp: number;
  aiCoreHp: number;
  turnsUsed: number;
};
