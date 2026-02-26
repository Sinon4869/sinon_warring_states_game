import { type BattleWriteback, type CampaignState } from '@/lib/game/types';

function clamp(v: number, min = 0, max = 9999) {
  return Math.max(min, Math.min(max, v));
}

export function applyBattleWriteback(campaign: CampaignState, report: BattleWriteback): CampaignState {
  const next = { ...campaign };
  const damageRatio = Math.max(0, Math.min(1, (1800 - report.playerCoreHp) / 1800));

  if (report.winner === 'player') {
    next.land = clamp(next.land + 1, 0, 10);
    next.enemyLand = clamp(next.enemyLand - 1, 0, 10);
    next.prestige = clamp(next.prestige + 8, 0, 100);
    next.army = clamp(next.army - Math.floor(8 + damageRatio * 16), 0, 999);
    next.logs = [`战报：实时战斗胜利，夺取一国`, ...next.logs].slice(0, 30);
  } else if (report.winner === 'ai') {
    next.land = clamp(next.land - 1, 0, 10);
    next.enemyLand = clamp(next.enemyLand + 1, 0, 10);
    next.order = clamp(next.order - 8, 0, 100);
    next.army = clamp(next.army - Math.floor(14 + damageRatio * 20), 0, 999);
    next.logs = [`战报：实时战斗失利，边境退却`, ...next.logs].slice(0, 30);
  } else {
    next.prestige = clamp(next.prestige + 1, 0, 100);
    next.logs = [`战报：实时战斗平局，僵持收场`, ...next.logs].slice(0, 30);
  }

  return next;
}
