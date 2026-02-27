export type PveStage = {
  id: string;
  chapter: number;
  name: string;
  desc: string;
  aiPersona: 'aggressive' | 'balanced' | 'defensive';
  timeLimit: number;
  playerCore: number;
  aiCore: number;
  playerAtkRate: number;
  aiAtkRate: number;
};

export const PVE_STAGES: PveStage[] = [
  { id: 'c1-s1', chapter: 1, name: '边境试锋', desc: '基础攻防教学关。', aiPersona: 'balanced', timeLimit: 120, playerCore: 1850, aiCore: 1600, playerAtkRate: 1.05, aiAtkRate: 0.95 },
  { id: 'c1-s2', chapter: 1, name: '粮道突袭', desc: '敌军偏防守，考验推进节奏。', aiPersona: 'defensive', timeLimit: 115, playerCore: 1800, aiCore: 1650, playerAtkRate: 1, aiAtkRate: 0.98 },
  { id: 'c1-s3', chapter: 1, name: '山口争夺', desc: '中路高压，要求调线。', aiPersona: 'aggressive', timeLimit: 110, playerCore: 1750, aiCore: 1700, playerAtkRate: 1, aiAtkRate: 1.02 },
  { id: 'c2-s1', chapter: 2, name: '夜袭营寨', desc: '敌军强攻频率更高。', aiPersona: 'aggressive', timeLimit: 105, playerCore: 1750, aiCore: 1750, playerAtkRate: 1, aiAtkRate: 1.06 },
  { id: 'c2-s2', chapter: 2, name: '坚城鏖战', desc: '敌方高耐久防守。', aiPersona: 'defensive', timeLimit: 105, playerCore: 1700, aiCore: 1850, playerAtkRate: 1.05, aiAtkRate: 1.04 },
  { id: 'c2-s3', chapter: 2, name: '三线合围', desc: '多线高压并行。', aiPersona: 'balanced', timeLimit: 100, playerCore: 1700, aiCore: 1800, playerAtkRate: 1.02, aiAtkRate: 1.08 },
  { id: 'c3-s1', chapter: 3, name: '破竹南征', desc: '节奏更快的攻坚战。', aiPersona: 'aggressive', timeLimit: 95, playerCore: 1650, aiCore: 1850, playerAtkRate: 1.06, aiAtkRate: 1.1 },
  { id: 'c3-s2', chapter: 3, name: '反包围战', desc: '防守反击窗口更窄。', aiPersona: 'defensive', timeLimit: 95, playerCore: 1650, aiCore: 1900, playerAtkRate: 1.08, aiAtkRate: 1.1 },
  { id: 'c3-s3', chapter: 3, name: '天下分晓', desc: '终局总力战。', aiPersona: 'balanced', timeLimit: 90, playerCore: 1600, aiCore: 1950, playerAtkRate: 1.12, aiAtkRate: 1.12 },
  { id: 'c3-s4', chapter: 3, name: '终焉试炼', desc: '隐藏高压关卡。', aiPersona: 'aggressive', timeLimit: 85, playerCore: 1550, aiCore: 2000, playerAtkRate: 1.12, aiAtkRate: 1.16 }
];

export function getPveStage(id?: string | null) {
  if (!id) return null;
  return PVE_STAGES.find((s) => s.id === id) ?? null;
}
