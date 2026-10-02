import type {
  BossSlotConfig,
  HelperConfig,
  MineConfig,
  QuestTemplate,
  SkillNode,
  TutorialConfig,
} from './types.js';

export const mines: MineConfig[] = [
  {
    id: 1,
    name: 'Медная жила',
    oreId: 'copper',
    oreName: 'Медная руда',
    oreAsset: '/ores/ore-copper.jpg',
    bgAsset: '/bg/mine-copper.jpg',
    unlockSoft: 0,
    oreToSoft: 1,
    digBase: 1,
    tutorialId: 'mine-1',
  },
  {
    id: 2,
    name: 'Янтарные катакомбы',
    oreId: 'amber',
    oreName: 'Янтарная руда',
    oreAsset: '/ores/ore-amber.jpg',
    bgAsset: '/bg/mine-amber.jpg',
    unlockSoft: 25_000,
    oreToSoft: 2.5,
    digBase: 2,
    tutorialId: 'mine-2',
  },
];

export const helpers: HelperConfig[] = [
  {
    id: 'cart-runner',
    name: 'Тачечник',
    baseCost: 40,
    costGrowth: 1.45,
    orePerSec: 0.4,
    bossDamageBonus: 0.5,
  },
  {
    id: 'lamp-keeper',
    name: 'Фонарщик',
    baseCost: 120,
    costGrowth: 1.5,
    orePerSec: 1.1,
    bossDamageBonus: 1.2,
  },
  {
    id: 'drill-adept',
    name: 'Буровик',
    baseCost: 400,
    costGrowth: 1.55,
    orePerSec: 3.2,
    bossDamageBonus: 2.5,
  },
];

export const skillTree: SkillNode[] = [
  {
    id: 'm-ore-1',
    branch: 'mining',
    name: 'Крепкая кирка',
    cost: 1,
    effect: { key: 'dig_yield', value: 0.1 },
  },
  {
    id: 'm-ore-2',
    branch: 'mining',
    name: 'Глубже пласт',
    cost: 1,
    effect: { key: 'dig_yield', value: 0.15 },
    requires: ['m-ore-1'],
  },
  {
    id: 'h-rate-1',
    branch: 'helpers',
    name: 'Бригада',
    cost: 1,
    effect: { key: 'helper_rate', value: 0.12 },
  },
  {
    id: 'h-rate-2',
    branch: 'helpers',
    name: 'Смена без простоя',
    cost: 1,
    effect: { key: 'helper_rate', value: 0.18 },
    requires: ['h-rate-1'],
  },
  {
    id: 'b-dmg-1',
    branch: 'boss',
    name: 'Удар по породе',
    cost: 1,
    effect: { key: 'boss_damage', value: 0.15 },
  },
  {
    id: 'b-dmg-2',
    branch: 'boss',
    name: 'Разрушитель',
    cost: 1,
    effect: { key: 'boss_damage', value: 0.25 },
    requires: ['b-dmg-1'],
  },
];

export const quests: QuestTemplate[] = [
  {
    id: 'd-ore',
    type: 'daily',
    title: 'Добыть 200 руды',
    target: 200,
    metric: 'ore',
    rewards: { soft: 150, xp: 40 },
  },
  {
    id: 'd-upgrade',
    type: 'daily',
    title: 'Купить 2 улучшения',
    target: 2,
    metric: 'upgrade',
    rewards: { soft: 120, xp: 30 },
  },
  {
    id: 'd-boss',
    type: 'daily',
    title: 'Нанести 500 урона боссу',
    target: 500,
    metric: 'boss_damage',
    rewards: { soft: 200, xp: 60, skillPoints: 1 },
  },
  {
    id: 'ms-mine-2',
    type: 'milestone',
    title: 'Открыть вторую шахту',
    target: 1,
    metric: 'mine_unlock',
    rewards: { soft: 500, xp: 100, skillPoints: 1 },
  },
  {
    id: 'ms-prestige',
    type: 'milestone',
    title: 'Первый престиж',
    target: 1,
    metric: 'prestige',
    rewards: { soft: 300, xp: 80, skillPoints: 2 },
  },
  {
    id: 'ms-boss',
    type: 'milestone',
    title: 'Участвовать в боссе',
    target: 1,
    metric: 'boss_join',
    rewards: { soft: 250, xp: 70 },
  },
];

export const bossSlots: BossSlotConfig[] = [
  {
    hour: 10,
    hp: 250_000,
    rewardSoftPool: 40_000,
    rewardXpPool: 8_000,
    minParticipationSoft: 50,
    top1SoftCap: 8_000,
  },
  {
    hour: 15,
    hp: 320_000,
    rewardSoftPool: 55_000,
    rewardXpPool: 10_000,
    minParticipationSoft: 60,
    top1SoftCap: 10_000,
  },
  {
    hour: 20,
    hp: 400_000,
    rewardSoftPool: 70_000,
    rewardXpPool: 12_000,
    minParticipationSoft: 80,
    top1SoftCap: 12_000,
  },
];

export const tutorials: TutorialConfig[] = [
  {
    id: 'mine-1',
    mineId: 1,
    lines: [
      { speaker: 'Проводник', text: 'Добро пожаловать в Медную жилу. Тапай по породе — руда копится.' },
      { speaker: 'Проводник', text: 'Помощники копают, пока ты офлайн. Не забывай про босса в 10, 15 и 20 МСК.' },
      { speaker: 'Проводник', text: 'Улучшай кирку и скорость — так быстрее выйдешь на престиж.' },
    ],
  },
  {
    id: 'mine-2',
    mineId: 2,
    lines: [
      { speaker: 'Проводник', text: 'Янтарные катакомбы глубже. Здесь руда дороже, но породы крепче.' },
      { speaker: 'Проводник', text: 'Прокачай ветку «Босс» — общий рейд наградит сильнее.' },
      { speaker: 'Проводник', text: 'Престиж сбросит шахту, но оставит множитель добычи навсегда.' },
    ],
  },
];
