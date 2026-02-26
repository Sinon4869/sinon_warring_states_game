export type UnitBalance = {
  id: string;
  name: string;
  cost: number;
  hp: number;
  atk: number;
  speed: number;
  range: number;
};

export type EconBalance = {
  popFoodFactor: number;
  armyFoodFactor: number;
  popGoldFactor: number;
  landGoldFlat: number;
};

export type BalanceConfig = {
  version: 1;
  units: UnitBalance[];
  econ: EconBalance;
};

export const DEFAULT_BALANCE: BalanceConfig = {
  version: 1,
  units: [
    { id: 'yari', name: '足轻枪队', cost: 2, hp: 85, atk: 14, speed: 11, range: 4 },
    { id: 'archer', name: '铁炮队', cost: 3, hp: 70, atk: 18, speed: 8, range: 11 },
    { id: 'cavalry', name: '骑马突击', cost: 4, hp: 130, atk: 22, speed: 14, range: 5 },
    { id: 'onyo', name: '军师众', cost: 5, hp: 95, atk: 28, speed: 9, range: 12 }
  ],
  econ: {
    popFoodFactor: 0.08,
    armyFoodFactor: 0.05,
    popGoldFactor: 0.07,
    landGoldFlat: 5
  }
};

export function parseBalanceConfig(raw: string | null | undefined): BalanceConfig {
  if (!raw) return DEFAULT_BALANCE;
  try {
    const v = JSON.parse(raw) as BalanceConfig;
    if (!v || !Array.isArray(v.units) || !v.econ) return DEFAULT_BALANCE;
    return {
      version: 1,
      units: v.units.map((u) => ({
        id: String(u.id),
        name: String(u.name),
        cost: Number(u.cost),
        hp: Number(u.hp),
        atk: Number(u.atk),
        speed: Number(u.speed),
        range: Number(u.range)
      })),
      econ: {
        popFoodFactor: Number(v.econ.popFoodFactor),
        armyFoodFactor: Number(v.econ.armyFoodFactor),
        popGoldFactor: Number(v.econ.popGoldFactor),
        landGoldFlat: Number(v.econ.landGoldFlat)
      }
    };
  } catch {
    return DEFAULT_BALANCE;
  }
}
