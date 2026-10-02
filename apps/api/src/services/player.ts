import {
  applyXp,
  bossHitDamage,
  capacityLimit,
  digYield,
  GAME,
  helpers,
  helpersOrePerSec,
  mines,
  OFFLINE_DIG_CAP_HOURS,
  skillEffectSum,
  skillTree,
  type PlayerHelper,
  type PlayerState,
  type PlayerUpgrades,
  upgradeCost,
} from '@pb/shared';
import { pool } from '../db/pool.js';

type PlayerRow = {
  max_user_id: string;
  display_name: string;
  level: number;
  xp: number;
  soft: string | number;
  hard: string | number;
  skill_points: number;
  prestige_count: number;
  prestige_mult: number;
  mine_id: number;
  ore: number;
  upgrades: PlayerUpgrades;
  helpers: PlayerHelper[];
  skills: string[];
  seen_tutorials: string[];
  quest_progress: Record<string, number>;
  last_sync_at: Date;
};

function rowToState(row: PlayerRow): PlayerState & { questProgress: Record<string, number> } {
  return {
    maxUserId: row.max_user_id,
    displayName: row.display_name,
    level: row.level,
    xp: row.xp,
    soft: Number(row.soft),
    hard: Number(row.hard),
    skillPoints: row.skill_points,
    prestigeCount: row.prestige_count,
    prestigeMult: row.prestige_mult,
    mineId: row.mine_id,
    ore: row.ore,
    upgrades: row.upgrades,
    helpers: row.helpers,
    skills: row.skills,
    seenTutorials: row.seen_tutorials,
    lastSyncAt: row.last_sync_at.toISOString(),
    questProgress: row.quest_progress ?? {},
  };
}

export async function ensurePlayer(maxUserId: string, displayName?: string) {
  const existing = await pool.query<PlayerRow>('SELECT * FROM players WHERE max_user_id = $1', [maxUserId]);
  if (existing.rows[0]) return settleOffline(existing.rows[0]);

  const inserted = await pool.query<PlayerRow>(
    `INSERT INTO players (max_user_id, display_name, soft, seen_tutorials)
     VALUES ($1, $2, 50, '["mine-1"]'::jsonb)
     RETURNING *`,
    [maxUserId, displayName || 'Шахтёр'],
  );
  return rowToState(inserted.rows[0]);
}

async function settleOffline(row: PlayerRow) {
  const now = Date.now();
  const last = row.last_sync_at.getTime();
  const elapsedSec = Math.min((now - last) / 1000, OFFLINE_DIG_CAP_HOURS * 3600);
  const digBonus = skillEffectSum(row.skills, skillTree, 'helper_rate');
  const rate = helpersOrePerSec(row.helpers, helpers, row.prestige_mult, digBonus);
  const cap = capacityLimit(row.upgrades);
  const newOre = Math.min(cap, row.ore + rate * elapsedSec);

  const updated = await pool.query<PlayerRow>(
    `UPDATE players SET ore = $2, last_sync_at = NOW() WHERE max_user_id = $1 RETURNING *`,
    [row.max_user_id, newOre],
  );
  return rowToState(updated.rows[0]);
}

export async function getPlayer(maxUserId: string) {
  const res = await pool.query<PlayerRow>('SELECT * FROM players WHERE max_user_id = $1', [maxUserId]);
  if (!res.rows[0]) return null;
  return settleOffline(res.rows[0]);
}

async function bumpQuest(maxUserId: string, metric: string, amount: number) {
  await pool.query(
    `UPDATE players SET quest_progress = jsonb_set(
       COALESCE(quest_progress, '{}'::jsonb),
       ARRAY[$2],
       to_jsonb(COALESCE((quest_progress->>$2)::int, 0) + $3)
     ) WHERE max_user_id = $1`,
    [maxUserId, metric, amount],
  );
}

export async function dig(maxUserId: string) {
  const player = await getPlayer(maxUserId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');
  const digBonus = skillEffectSum(player.skills, skillTree, 'dig_yield');
  const yieldAmt = digYield(player.upgrades, player.prestigeMult, digBonus);
  const cap = capacityLimit(player.upgrades);
  const ore = Math.min(cap, player.ore + yieldAmt);
  const res = await pool.query<PlayerRow>(
    `UPDATE players SET ore = $2, last_sync_at = NOW() WHERE max_user_id = $1 RETURNING *`,
    [maxUserId, ore],
  );
  await bumpQuest(maxUserId, 'ore', yieldAmt);
  return rowToState(res.rows[0]);
}

export async function convertOre(maxUserId: string) {
  const player = await getPlayer(maxUserId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');
  const mine = mines.find((m) => m.id === player.mineId) ?? mines[0];
  const softGain = Math.floor(player.ore * mine.oreToSoft);
  const res = await pool.query<PlayerRow>(
    `UPDATE players SET soft = soft + $2, ore = 0, last_sync_at = NOW() WHERE max_user_id = $1 RETURNING *`,
    [maxUserId, softGain],
  );
  return { state: rowToState(res.rows[0]), softGain };
}

export async function buyUpgrade(maxUserId: string, key: keyof PlayerUpgrades) {
  const player = await getPlayer(maxUserId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');
  const level = player.upgrades[key];
  const cost = upgradeCost(level);
  if (player.soft < cost) throw new Error('NOT_ENOUGH_SOFT');
  const next = { ...player.upgrades, [key]: level + 1 };
  const res = await pool.query<PlayerRow>(
    `UPDATE players SET soft = soft - $2, upgrades = $3::jsonb, last_sync_at = NOW()
     WHERE max_user_id = $1 RETURNING *`,
    [maxUserId, cost, JSON.stringify(next)],
  );
  await bumpQuest(maxUserId, 'upgrade', 1);
  return rowToState(res.rows[0]);
}

export async function buyHelper(maxUserId: string, helperId: string) {
  const player = await getPlayer(maxUserId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');
  const cfg = helpers.find((h) => h.id === helperId);
  if (!cfg) throw new Error('HELPER_NOT_FOUND');
  const owned = player.helpers.find((h) => h.helperId === helperId);
  const level = owned?.level ?? 0;
  const cost = Math.floor(cfg.baseCost * Math.pow(cfg.costGrowth, level));
  if (player.soft < cost) throw new Error('NOT_ENOUGH_SOFT');
  let nextHelpers: PlayerHelper[];
  if (owned) {
    nextHelpers = player.helpers.map((h) =>
      h.helperId === helperId ? { ...h, level: h.level + 1 } : h,
    );
  } else {
    nextHelpers = [...player.helpers, { helperId, level: 1 }];
  }
  const res = await pool.query<PlayerRow>(
    `UPDATE players SET soft = soft - $2, helpers = $3::jsonb, last_sync_at = NOW()
     WHERE max_user_id = $1 RETURNING *`,
    [maxUserId, cost, JSON.stringify(nextHelpers)],
  );
  return rowToState(res.rows[0]);
}

export async function unlockSkill(maxUserId: string, skillId: string) {
  const player = await getPlayer(maxUserId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');
  const node = skillTree.find((s) => s.id === skillId);
  if (!node) throw new Error('SKILL_NOT_FOUND');
  if (player.skills.includes(skillId)) throw new Error('ALREADY_OWNED');
  if (player.skillPoints < node.cost) throw new Error('NOT_ENOUGH_SP');
  if (node.requires?.some((r) => !player.skills.includes(r))) throw new Error('REQUIRES_MISSING');
  const res = await pool.query<PlayerRow>(
    `UPDATE players SET skill_points = skill_points - $2, skills = skills || $3::jsonb, last_sync_at = NOW()
     WHERE max_user_id = $1 RETURNING *`,
    [maxUserId, node.cost, JSON.stringify([skillId])],
  );
  return rowToState(res.rows[0]);
}

export async function unlockMine(maxUserId: string, mineId: number) {
  const player = await getPlayer(maxUserId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');
  const mine = mines.find((m) => m.id === mineId);
  if (!mine) throw new Error('MINE_NOT_FOUND');
  if (player.mineId >= mineId) throw new Error('ALREADY_UNLOCKED');
  if (player.soft < mine.unlockSoft) throw new Error('NOT_ENOUGH_SOFT');
  const seen = mine.tutorialId ? [...new Set([...player.seenTutorials, mine.tutorialId])] : player.seenTutorials;
  const res = await pool.query<PlayerRow>(
    `UPDATE players SET soft = soft - $2, mine_id = $3, ore = 0, seen_tutorials = $4::jsonb, last_sync_at = NOW()
     WHERE max_user_id = $1 RETURNING *`,
    [maxUserId, mine.unlockSoft, mineId, JSON.stringify(seen)],
  );
  await bumpQuest(maxUserId, 'mine_unlock', 1);
  return rowToState(res.rows[0]);
}

export async function prestige(maxUserId: string) {
  const player = await getPlayer(maxUserId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');
  if (player.soft < GAME.prestigeSoftRequirement) throw new Error('PRESTIGE_LOCKED');
  const res = await pool.query<PlayerRow>(
    `UPDATE players SET
       soft = 0,
       ore = 0,
       mine_id = 1,
       upgrades = '{"pickaxe":0,"speed":0,"capacity":0,"multiplier":0}'::jsonb,
       helpers = '[]'::jsonb,
       skills = '[]'::jsonb,
       prestige_count = prestige_count + 1,
       prestige_mult = prestige_mult + $2,
       skill_points = skill_points + 2,
       last_sync_at = NOW()
     WHERE max_user_id = $1 RETURNING *`,
    [maxUserId, GAME.prestigeMultPerRun],
  );
  await bumpQuest(maxUserId, 'prestige', 1);
  return rowToState(res.rows[0]);
}

export async function claimQuest(maxUserId: string, questId: string) {
  const { quests } = await import('@pb/shared');
  const player = await getPlayer(maxUserId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');
  const q = quests.find((x) => x.id === questId);
  if (!q) throw new Error('QUEST_NOT_FOUND');
  const progress = player.questProgress[q.metric] ?? 0;
  const claimedKey = `claimed:${questId}`;
  if ((player.questProgress[claimedKey] ?? 0) > 0) throw new Error('ALREADY_CLAIMED');
  if (progress < q.target) throw new Error('QUEST_INCOMPLETE');

  const soft = q.rewards.soft ?? 0;
  const xpGain = q.rewards.xp ?? 0;
  const sp = q.rewards.skillPoints ?? 0;
  const leveled = applyXp(player.level, player.xp, xpGain);

  const nextProgress = { ...player.questProgress, [claimedKey]: 1 };
  const res = await pool.query<PlayerRow>(
    `UPDATE players SET soft = soft + $2, level = $3, xp = $4, skill_points = skill_points + $5,
      quest_progress = $6::jsonb, last_sync_at = NOW()
     WHERE max_user_id = $1 RETURNING *`,
    [maxUserId, soft, leveled.level, leveled.xp, sp + leveled.skillPoints, JSON.stringify(nextProgress)],
  );
  return rowToState(res.rows[0]);
}

export async function applyBossRewards(
  maxUserId: string,
  soft: number,
  xp: number,
) {
  const player = await getPlayer(maxUserId);
  if (!player) return;
  const leveled = applyXp(player.level, player.xp, xp);
  await pool.query(
    `UPDATE players SET soft = soft + $2, level = $3, xp = $4, skill_points = skill_points + $5, last_sync_at = NOW()
     WHERE max_user_id = $1`,
    [maxUserId, soft, leveled.level, leveled.xp, leveled.skillPoints],
  );
  await bumpQuest(maxUserId, 'boss_join', 1);
}

export async function addBossDamageQuest(maxUserId: string, damage: number) {
  await bumpQuest(maxUserId, 'boss_damage', damage);
}

export async function markTutorialSeen(maxUserId: string, tutorialId: string) {
  const player = await getPlayer(maxUserId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');
  if (player.seenTutorials.includes(tutorialId)) return player;
  const seen = [...player.seenTutorials, tutorialId];
  const res = await pool.query<PlayerRow>(
    `UPDATE players SET seen_tutorials = $2::jsonb WHERE max_user_id = $1 RETURNING *`,
    [maxUserId, JSON.stringify(seen)],
  );
  return rowToState(res.rows[0]);
}
