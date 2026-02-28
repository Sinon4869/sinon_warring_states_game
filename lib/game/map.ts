import type { CampaignState } from '@/lib/game/types';

export type RegionOwner = 'player' | 'enemy' | 'neutral';

export type Region = {
  id: string;
  name: string;
  x: number;
  y: number;
  terrain: 'plain' | 'mountain' | 'river';
  tag?: 'capital' | 'fort' | 'granary';
};

export type Edge = { from: string; to: string };

export type MapActionType = 'march' | 'attack' | 'resupply';

export type MapBattleContext = {
  id: string;
  region: string;
  terrain: 'plain' | 'mountain' | 'river';
  enemyPower: number;
  supply: number;
  objective: string;
  recommended: 'expand' | 'fortify' | 'rest';
  mapAction: MapActionType;
  regionId: string;
};

export const REGIONS: Region[] = [
  { id: 'r1', name: '并州', x: 90, y: 90, terrain: 'mountain', tag: 'fort' },
  { id: 'r2', name: '冀州', x: 180, y: 80, terrain: 'plain' },
  { id: 'r3', name: '幽州', x: 270, y: 70, terrain: 'plain', tag: 'fort' },
  { id: 'r4', name: '青州', x: 350, y: 110, terrain: 'river' },
  { id: 'r5', name: '兖州', x: 250, y: 145, terrain: 'plain' },
  { id: 'r6', name: '豫州', x: 220, y: 210, terrain: 'plain', tag: 'granary' },
  { id: 'r7', name: '司隶', x: 150, y: 200, terrain: 'mountain', tag: 'capital' },
  { id: 'r8', name: '雍州', x: 70, y: 220, terrain: 'mountain', tag: 'fort' },
  { id: 'r9', name: '凉州', x: 35, y: 160, terrain: 'mountain' },
  { id: 'r10', name: '徐州', x: 340, y: 180, terrain: 'river' },
  { id: 'r11', name: '扬州', x: 360, y: 260, terrain: 'river', tag: 'granary' },
  { id: 'r12', name: '荆州', x: 250, y: 285, terrain: 'plain' },
  { id: 'r13', name: '益州', x: 120, y: 300, terrain: 'mountain', tag: 'fort' },
  { id: 'r14', name: '交州', x: 220, y: 380, terrain: 'river' },
  { id: 'r15', name: '桂州', x: 160, y: 360, terrain: 'plain' },
  { id: 'r16', name: '襄阳', x: 210, y: 255, terrain: 'plain' },
  { id: 'r17', name: '宛城', x: 180, y: 245, terrain: 'plain', tag: 'fort' },
  { id: 'r18', name: '寿春', x: 305, y: 225, terrain: 'river' },
  { id: 'r19', name: '建业', x: 335, y: 305, terrain: 'river', tag: 'capital' },
  { id: 'r20', name: '成都', x: 95, y: 335, terrain: 'mountain', tag: 'capital' }
];

export const EDGES: Edge[] = [
  { from: 'r1', to: 'r2' }, { from: 'r2', to: 'r3' }, { from: 'r3', to: 'r4' },
  { from: 'r2', to: 'r5' }, { from: 'r5', to: 'r6' }, { from: 'r6', to: 'r7' },
  { from: 'r7', to: 'r8' }, { from: 'r8', to: 'r9' }, { from: 'r5', to: 'r10' },
  { from: 'r10', to: 'r11' }, { from: 'r11', to: 'r19' }, { from: 'r6', to: 'r16' },
  { from: 'r16', to: 'r17' }, { from: 'r16', to: 'r12' }, { from: 'r12', to: 'r15' },
  { from: 'r15', to: 'r14' }, { from: 'r13', to: 'r15' }, { from: 'r13', to: 'r20' },
  { from: 'r6', to: 'r18' }, { from: 'r18', to: 'r19' }, { from: 'r12', to: 'r11' },
  { from: 'r8', to: 'r13' }
];

const ORDER = REGIONS.map((r) => r.id);

export function resolveOwnership(campaign?: Pick<CampaignState, 'land' | 'enemyLand'>) {
  const playerCount = Math.max(1, Math.min(10, campaign?.land ?? 1));
  const enemyCount = Math.max(0, Math.min(10, campaign?.enemyLand ?? 9));
  const owners: Record<string, RegionOwner> = {};
  ORDER.forEach((id) => {
    owners[id] = 'neutral';
  });
  ORDER.slice(0, playerCount).forEach((id) => {
    owners[id] = 'player';
  });
  ORDER.slice(ORDER.length - enemyCount).forEach((id) => {
    owners[id] = owners[id] === 'player' ? 'player' : 'enemy';
  });
  return owners;
}

export function frontierEdges(owners: Record<string, RegionOwner>) {
  return EDGES.filter((e) => owners[e.from] !== owners[e.to]);
}

export function regionNeighbors(regionId: string) {
  return EDGES.flatMap((e) => {
    if (e.from === regionId) return [e.to];
    if (e.to === regionId) return [e.from];
    return [] as string[];
  });
}

export function hasSupplyLine(regionId: string, owners: Record<string, RegionOwner>) {
  if (owners[regionId] !== 'player') return false;
  const capitals = REGIONS.filter((r) => r.tag === 'capital').map((r) => r.id);
  const visited = new Set<string>();
  const q: string[] = [regionId];

  while (q.length > 0) {
    const cur = q.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    if (capitals.includes(cur) && owners[cur] === 'player') return true;
    for (const n of regionNeighbors(cur)) {
      if (!visited.has(n) && owners[n] === 'player') q.push(n);
    }
  }
  return false;
}

export type EnemyMapDecision = {
  action: 'expand' | 'harass' | 'cut_supply';
  targetRegionId: string;
  targetRegionName: string;
  reason: string;
};

export function chooseEnemyMapDecision(owners: Record<string, RegionOwner>): EnemyMapDecision | null {
  const enemyRegions = REGIONS.filter((r) => owners[r.id] === 'enemy');
  if (enemyRegions.length === 0) return null;

  const frontier = EDGES.flatMap((e) => {
    const a = owners[e.from];
    const b = owners[e.to];
    if (a === 'enemy' && b === 'player') return [e.to];
    if (b === 'enemy' && a === 'player') return [e.from];
    if (a === 'enemy' && b === 'neutral') return [e.to];
    if (b === 'enemy' && a === 'neutral') return [e.from];
    return [] as string[];
  });

  const uniqueTargets = [...new Set(frontier)].map((id) => REGIONS.find((r) => r.id === id)).filter(Boolean) as Region[];
  if (uniqueTargets.length === 0) {
    const fallback = enemyRegions[0];
    return { action: 'harass', targetRegionId: fallback.id, targetRegionName: fallback.name, reason: '边境平静，执行骚扰侦察' };
  }

  const sorted = uniqueTargets.sort((a, b) => {
    const wa = (a.tag === 'capital' ? 3 : a.tag === 'granary' ? 2 : 1) + (a.terrain === 'river' ? 1 : 0);
    const wb = (b.tag === 'capital' ? 3 : b.tag === 'granary' ? 2 : 1) + (b.terrain === 'river' ? 1 : 0);
    return wb - wa;
  });

  const top = sorted[0];
  const action = top.tag === 'granary' ? 'cut_supply' : owners[top.id] === 'player' ? 'harass' : 'expand';
  const reason = action === 'cut_supply' ? '瞄准粮道切断补给' : action === 'harass' ? '对我方边境施压' : '向中立区域扩张';
  return { action, targetRegionId: top.id, targetRegionName: top.name, reason };
}

export function createBattleContextFromMap(region: Region, action: MapActionType, supplyOk: boolean): MapBattleContext {
  const baseEnemy = action === 'attack' ? 120 : action === 'march' ? 95 : 85;
  const terrainBuff = region.terrain === 'mountain' ? 18 : region.terrain === 'river' ? 12 : 0;
  const enemyPower = baseEnemy + terrainBuff + (region.tag === 'fort' ? 20 : 0);
  const supply = supplyOk ? 78 : 42;
  const objective = action === 'attack' ? `夺取${region.name}` : action === 'march' ? `推进至${region.name}` : `稳住${region.name}补给线`;
  const recommended = action === 'attack' ? 'expand' : action === 'march' ? 'fortify' : 'rest';

  return {
    id: `map-${Date.now()}-${region.id}`,
    region: region.name,
    terrain: region.terrain,
    enemyPower,
    supply,
    objective,
    recommended,
    mapAction: action,
    regionId: region.id
  };
}
