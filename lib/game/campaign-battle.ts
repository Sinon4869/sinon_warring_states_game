import { type BattleWriteback, type CampaignState } from '@/lib/game/types';

function clamp(v: number, min = 0, max = 9999) {
  return Math.max(min, Math.min(max, v));
}

export function applyBattleWriteback(campaign: CampaignState, report: BattleWriteback): CampaignState {
  const next = { ...campaign };

  const playerLossRatio = Math.max(0, Math.min(1, (1800 - report.playerCoreHp) / 1800));
  const enemyLossRatio = Math.max(0, Math.min(1, (1800 - report.aiCoreHp) / 1800));
  const paceBonus = report.turnsUsed <= 45 ? 1.15 : report.turnsUsed <= 75 ? 1 : 0.9;

  const moraleDelta = Math.round((enemyLossRatio - playerLossRatio) * 18);
  const baseArmyLoss = Math.round(8 + playerLossRatio * 16 + (report.turnsUsed > 90 ? 4 : 0));

  if (report.winner === 'player') {
    next.land = clamp(next.land + 1, 0, 10);
    next.enemyLand = clamp(next.enemyLand - 1, 0, 10);

    const prestigeGain = Math.round((6 + enemyLossRatio * 8) * paceBonus);
    const orderGain = Math.max(2, Math.round(3 + moraleDelta * 0.4));
    const goldGain = Math.round(10 + enemyLossRatio * 20);

    next.prestige = clamp(next.prestige + prestigeGain, 0, 100);
    next.order = clamp(next.order + orderGain, 0, 100);
    next.gold = clamp(next.gold + goldGain, 0, 999);
    next.army = clamp(next.army - baseArmyLoss, 0, 999);

    next.logs = [
      `战报：胜利夺地（战损${Math.round(playerLossRatio * 100)}%，歼敌${Math.round(enemyLossRatio * 100)}%，耗时${report.turnsUsed}s）`,
      ...next.logs
    ].slice(0, 30);
  } else if (report.winner === 'ai') {
    next.land = clamp(next.land - 1, 0, 10);
    next.enemyLand = clamp(next.enemyLand + 1, 0, 10);

    const orderLoss = Math.round(7 + Math.max(0, -moraleDelta) * 0.5);
    const prestigeLoss = Math.round(4 + (playerLossRatio < enemyLossRatio ? 2 : 5));
    const goldLoss = Math.round(6 + playerLossRatio * 18);

    next.order = clamp(next.order - orderLoss, 0, 100);
    next.prestige = clamp(next.prestige - prestigeLoss, 0, 100);
    next.gold = clamp(next.gold - goldLoss, 0, 999);
    next.army = clamp(next.army - Math.round(baseArmyLoss + 6), 0, 999);

    next.logs = [
      `战报：失利退却（战损${Math.round(playerLossRatio * 100)}%，敌损${Math.round(enemyLossRatio * 100)}%，耗时${report.turnsUsed}s）`,
      ...next.logs
    ].slice(0, 30);
  } else {
    const prestigeAdj = moraleDelta > 0 ? 2 : 0;
    const orderAdj = moraleDelta >= 0 ? 2 : -2;
    next.prestige = clamp(next.prestige + prestigeAdj, 0, 100);
    next.order = clamp(next.order + orderAdj, 0, 100);
    next.army = clamp(next.army - Math.round(baseArmyLoss * 0.7), 0, 999);

    next.logs = [
      `战报：平局拉锯（战损${Math.round(playerLossRatio * 100)}%，敌损${Math.round(enemyLossRatio * 100)}%，耗时${report.turnsUsed}s）`,
      ...next.logs
    ].slice(0, 30);
  }

  return next;
}
