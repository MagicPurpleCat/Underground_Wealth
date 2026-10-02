import { GAME, type HelperConfig, type PlayerHelper, type PlayerUpgrades, type SkillNode } from './types.js';

export function upgradeCost(level: number): number {
  return Math.floor(GAME.upgradeBaseCost * Math.pow(GAME.upgradeCostGrowth, level));
}

export function digYield(upgrades: PlayerUpgrades, prestigeMult: number, skillBonus = 0): number {
  const pick = 1 + upgrades.pickaxe * 0.35;
  const speed = 1 + upgrades.speed * 0.08;
  const mult = 1 + upgrades.multiplier * 0.12;
  return Math.max(1, Math.floor(1 * pick * speed * mult * prestigeMult * (1 + skillBonus)));
}

export function capacityLimit(upgrades: PlayerUpgrades): number {
  return 50 + upgrades.capacity * 40;
}

export function helperCost(cfg: HelperConfig, level: number): number {
  return Math.floor(cfg.baseCost * Math.pow(cfg.costGrowth, level));
}

export function helpersOrePerSec(
  helpers: PlayerHelper[],
  catalog: HelperConfig[],
  prestigeMult: number,
  skillBonus = 0,
): number {
  let total = 0;
  for (const h of helpers) {
    const cfg = catalog.find((c) => c.id === h.helperId);
    if (!cfg) continue;
    total += cfg.orePerSec * (1 + (h.level - 1) * 0.25);
  }
  return total * prestigeMult * (1 + skillBonus);
}

export function offlineOre(
  seconds: number,
  orePerSec: number,
  currentOre: number,
  capacity: number,
): number {
  const gained = orePerSec * Math.max(0, seconds);
  return Math.min(capacity, currentOre + gained);
}

export function bossHitDamage(
  upgrades: PlayerUpgrades,
  helpers: PlayerHelper[],
  catalog: HelperConfig[],
  skills: string[],
  skillTree: SkillNode[],
  prestigeMult: number,
): number {
  const base = 5 + upgrades.pickaxe * 3 + upgrades.multiplier * 2;
  let helperBonus = 0;
  for (const h of helpers) {
    const cfg = catalog.find((c) => c.id === h.helperId);
    if (cfg) helperBonus += cfg.bossDamageBonus * h.level;
  }
  const skillBonus = skillEffectSum(skills, skillTree, 'boss_damage');
  return Math.max(1, Math.floor((base + helperBonus) * prestigeMult * (1 + skillBonus)));
}

export function skillEffectSum(owned: string[], tree: SkillNode[], key: string): number {
  let sum = 0;
  for (const id of owned) {
    const node = tree.find((n) => n.id === id);
    if (node?.effect.key === key) sum += node.effect.value;
  }
  return sum;
}

export function xpToNextLevel(level: number): number {
  return Math.floor(GAME.xpPerLevelBase * Math.pow(GAME.xpPerLevelGrowth, level - 1));
}

export function applyXp(level: number, xp: number, gained: number): { level: number; xp: number; skillPoints: number } {
  let L = level;
  let X = xp + gained;
  let sp = 0;
  let need = xpToNextLevel(L);
  while (X >= need) {
    X -= need;
    L += 1;
    sp += 1;
    need = xpToNextLevel(L);
  }
  return { level: L, xp: X, skillPoints: sp };
}

export function proportionalReward(
  damage: number,
  totalDamage: number,
  pool: number,
  floor: number,
  top1Cap: number,
  isTop1: boolean,
): number {
  if (damage <= 0 || totalDamage <= 0) return 0;
  let amount = Math.floor((damage / totalDamage) * pool);
  amount = Math.max(floor, amount);
  if (isTop1) amount = Math.min(amount, top1Cap);
  return amount;
}
