export type UpgradeKey = 'pickaxe' | 'speed' | 'capacity' | 'multiplier';

export interface MineConfig {
  id: number;
  name: string;
  oreId: string;
  oreName: string;
  oreAsset: string;
  bgAsset: string;
  unlockSoft: number;
  oreToSoft: number;
  digBase: number;
  tutorialId?: string;
}

export interface HelperConfig {
  id: string;
  name: string;
  baseCost: number;
  costGrowth: number;
  orePerSec: number;
  bossDamageBonus: number;
}

export interface SkillNode {
  id: string;
  branch: 'mining' | 'helpers' | 'boss';
  name: string;
  cost: number;
  effect: { key: string; value: number };
  requires?: string[];
}

export interface QuestTemplate {
  id: string;
  type: 'daily' | 'milestone';
  title: string;
  target: number;
  metric: 'ore' | 'upgrade' | 'boss_damage' | 'mine_unlock' | 'prestige' | 'boss_join';
  rewards: { soft?: number; xp?: number; skillPoints?: number };
}

export interface BossSlotConfig {
  hour: number; // Moscow local hour: 10, 15, 20
  hp: number;
  rewardSoftPool: number;
  rewardXpPool: number;
  minParticipationSoft: number;
  top1SoftCap: number;
}

export interface TutorialLine {
  speaker: string;
  text: string;
}

export interface TutorialConfig {
  id: string;
  mineId: number;
  lines: TutorialLine[];
}

export interface PlayerUpgrades {
  pickaxe: number;
  speed: number;
  capacity: number;
  multiplier: number;
}

export interface PlayerHelper {
  helperId: string;
  level: number;
}

export interface PlayerState {
  maxUserId: string;
  displayName: string;
  level: number;
  xp: number;
  soft: number;
  hard: number;
  skillPoints: number;
  prestigeCount: number;
  prestigeMult: number;
  mineId: number;
  ore: number;
  upgrades: PlayerUpgrades;
  helpers: PlayerHelper[];
  skills: string[];
  seenTutorials: string[];
  questProgress: Record<string, number>;
  lastSyncAt: string;
}

export interface BossPublicState {
  raidId: string;
  status: 'scheduled' | 'active' | 'ended';
  slotHour: number;
  hp: number;
  maxHp: number;
  endsAt: string | null;
  startsAt: string;
  myDamage: number;
  top: Array<{ maxUserId: string; displayName: string; damage: number }>;
}

export const BOSS_WINDOW_MS = 15 * 60 * 1000;
export const BOSS_HIT_COOLDOWN_MS = 800;
export const OFFLINE_DIG_CAP_HOURS = 8;

export const GAME = {
  xpPerLevelBase: 100,
  xpPerLevelGrowth: 1.35,
  upgradeBaseCost: 25,
  upgradeCostGrowth: 1.55,
  prestigeSoftRequirement: 50_000,
  prestigeMultPerRun: 0.15,
  digCooldownMs: 120,
} as const;
