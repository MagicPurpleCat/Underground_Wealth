import {
  BOSS_HIT_COOLDOWN_MS,
  BOSS_WINDOW_MS,
  bossHitDamage,
  bossSlots,
  helpers,
  proportionalReward,
  skillTree,
} from '@pb/shared';
import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import { redis } from '../db/redis.js';
import * as playerService from './player.js';

function moscowParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function moscowDateUtc(year: number, month: number, day: number, hour: number, minute = 0) {
  // Approximate: construct as UTC then adjust by Moscow offset via formatter roundtrip
  const guess = new Date(Date.UTC(year, month - 1, day, hour - 3, minute, 0));
  return guess;
}

export function nextBossStartsAt(now = new Date()): { startsAt: Date; hour: number } {
  const m = moscowParts(now);
  const hours = bossSlots.map((s) => s.hour).sort((a, b) => a - b);
  for (const hour of hours) {
    const start = moscowDateUtc(m.year, m.month, m.day, hour);
    if (start.getTime() + BOSS_WINDOW_MS > now.getTime() && start.getTime() > now.getTime() - BOSS_WINDOW_MS) {
      if (now.getTime() < start.getTime() + BOSS_WINDOW_MS) {
        return { startsAt: start, hour };
      }
    }
    if (start.getTime() > now.getTime()) return { startsAt: start, hour };
  }
  const tomorrow = new Date(moscowDateUtc(m.year, m.month, m.day, hours[0]).getTime() + 24 * 3600 * 1000);
  return { startsAt: tomorrow, hour: hours[0] };
}

export async function ensureActiveOrUpcomingRaid() {
  const now = new Date();
  const active = await pool.query(
    `SELECT * FROM boss_raids WHERE status = 'active' AND ends_at > NOW() ORDER BY starts_at DESC LIMIT 1`,
  );
  if (active.rows[0]) return active.rows[0];

  const { startsAt, hour } = nextBossStartsAt(now);
  const slot = bossSlots.find((s) => s.hour === hour)!;
  const withinWindow = now.getTime() >= startsAt.getTime() && now.getTime() < startsAt.getTime() + BOSS_WINDOW_MS;

  const existing = await pool.query(
    `SELECT * FROM boss_raids WHERE slot_hour = $1 AND starts_at = $2 LIMIT 1`,
    [hour, startsAt.toISOString()],
  );
  if (existing.rows[0]) {
    if (withinWindow && existing.rows[0].status !== 'active') {
      const ends = new Date(startsAt.getTime() + BOSS_WINDOW_MS);
      const upd = await pool.query(
        `UPDATE boss_raids SET status = 'active', ends_at = $2 WHERE id = $1 RETURNING *`,
        [existing.rows[0].id, ends.toISOString()],
      );
      await redis.set(`boss:hp:${existing.rows[0].id}`, String(slot.hp));
      return upd.rows[0];
    }
    return existing.rows[0];
  }

  const id = randomUUID();
  const status = withinWindow ? 'active' : 'scheduled';
  const endsAt = withinWindow ? new Date(startsAt.getTime() + BOSS_WINDOW_MS) : null;
  const inserted = await pool.query(
    `INSERT INTO boss_raids (id, slot_hour, status, max_hp, hp, starts_at, ends_at)
     VALUES ($1,$2,$3,$4,$4,$5,$6) RETURNING *`,
    [id, hour, status, slot.hp, startsAt.toISOString(), endsAt?.toISOString() ?? null],
  );
  if (withinWindow) await redis.set(`boss:hp:${id}`, String(slot.hp));
  return inserted.rows[0];
}

export async function getBossPublic(maxUserId?: string) {
  const raid = await ensureActiveOrUpcomingRaid();
  let hp = Number(raid.hp);
  if (raid.status === 'active') {
    const cached = await redis.get(`boss:hp:${raid.id}`);
    if (cached) hp = Number(cached);
  }
  const top = await pool.query(
    `SELECT max_user_id, display_name, damage FROM boss_damage WHERE raid_id = $1 ORDER BY damage DESC LIMIT 10`,
    [raid.id],
  );
  let myDamage = 0;
  if (maxUserId) {
    const mine = await pool.query(
      `SELECT damage FROM boss_damage WHERE raid_id = $1 AND max_user_id = $2`,
      [raid.id, maxUserId],
    );
    myDamage = Number(mine.rows[0]?.damage ?? 0);
  }
  return {
    raidId: raid.id,
    status: raid.status,
    slotHour: raid.slot_hour,
    hp,
    maxHp: Number(raid.max_hp),
    endsAt: raid.ends_at,
    startsAt: raid.starts_at,
    myDamage,
    top: top.rows.map((r) => ({
      maxUserId: r.max_user_id,
      displayName: r.display_name,
      damage: Number(r.damage),
    })),
  };
}

export async function hitBoss(maxUserId: string, displayName: string) {
  const raid = await ensureActiveOrUpcomingRaid();
  if (raid.status !== 'active') throw new Error('BOSS_NOT_ACTIVE');

  const cdKey = `boss:cd:${raid.id}:${maxUserId}`;
  const ok = await redis.set(cdKey, '1', 'PX', BOSS_HIT_COOLDOWN_MS, 'NX');
  if (!ok) throw new Error('COOLDOWN');

  const player = await playerService.getPlayer(maxUserId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');

  const dmg = bossHitDamage(
    player.upgrades,
    player.helpers,
    helpers,
    player.skills,
    skillTree,
    player.prestigeMult,
  );

  const hpKey = `boss:hp:${raid.id}`;
  const newHp = await redis.decrby(hpKey, dmg);
  await pool.query(
    `INSERT INTO boss_damage (raid_id, max_user_id, display_name, damage)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (raid_id, max_user_id)
     DO UPDATE SET damage = boss_damage.damage + EXCLUDED.damage, display_name = EXCLUDED.display_name`,
    [raid.id, maxUserId, displayName, dmg],
  );
  await pool.query(`UPDATE boss_raids SET hp = GREATEST(0, $2) WHERE id = $1`, [raid.id, newHp]);
  await playerService.addBossDamageQuest(maxUserId, dmg);

  if (newHp <= 0) await settleRaid(raid.id);

  return getBossPublic(maxUserId);
}

export async function settleRaid(raidId: string) {
  const raidRes = await pool.query(`SELECT * FROM boss_raids WHERE id = $1`, [raidId]);
  const raid = raidRes.rows[0];
  if (!raid || raid.settled) return;

  const slot = bossSlots.find((s) => s.hour === raid.slot_hour)!;
  const damages = await pool.query(
    `SELECT * FROM boss_damage WHERE raid_id = $1 ORDER BY damage DESC`,
    [raidId],
  );
  const total = damages.rows.reduce((s, r) => s + Number(r.damage), 0);

  for (let i = 0; i < damages.rows.length; i++) {
    const row = damages.rows[i];
    const soft = proportionalReward(
      Number(row.damage),
      total,
      slot.rewardSoftPool,
      slot.minParticipationSoft,
      slot.top1SoftCap,
      i === 0,
    );
    const xp = proportionalReward(
      Number(row.damage),
      total,
      slot.rewardXpPool,
      10,
      Math.floor(slot.rewardXpPool * 0.2),
      i === 0,
    );
    await playerService.applyBossRewards(row.max_user_id, soft, xp);
  }

  await pool.query(
    `UPDATE boss_raids SET status = 'ended', settled = TRUE, hp = 0, ends_at = COALESCE(ends_at, NOW()) WHERE id = $1`,
    [raidId],
  );
}

export async function tickBossLifecycle() {
  try {
    await redis.connect().catch(() => undefined);
  } catch {
    /* already connected */
  }
  const raid = await ensureActiveOrUpcomingRaid();
  if (raid.status === 'active' && raid.ends_at && new Date(raid.ends_at).getTime() <= Date.now()) {
    await settleRaid(raid.id);
  }
  // Auto-activate when window starts
  if (raid.status === 'scheduled' && new Date(raid.starts_at).getTime() <= Date.now()) {
    const ends = new Date(new Date(raid.starts_at).getTime() + BOSS_WINDOW_MS);
    await pool.query(`UPDATE boss_raids SET status = 'active', ends_at = $2 WHERE id = $1`, [
      raid.id,
      ends.toISOString(),
    ]);
    await redis.set(`boss:hp:${raid.id}`, String(raid.max_hp));
  }
}

export async function recentRaids(maxUserId: string, limit = 5) {
  const res = await pool.query(
    `SELECT r.id, r.slot_hour, r.starts_at, r.ends_at, r.status, d.damage
     FROM boss_raids r
     LEFT JOIN boss_damage d ON d.raid_id = r.id AND d.max_user_id = $1
     WHERE r.status = 'ended'
     ORDER BY r.starts_at DESC
     LIMIT $2`,
    [maxUserId, limit],
  );
  return res.rows.map((r) => ({
    raidId: r.id,
    slotHour: r.slot_hour,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    damage: Number(r.damage ?? 0),
  }));
}

/** Dev helper: force-start a short raid now */
export async function forceStartRaidDev() {
  const id = randomUUID();
  const slot = bossSlots[0];
  const starts = new Date();
  const ends = new Date(Date.now() + BOSS_WINDOW_MS);
  await pool.query(
    `INSERT INTO boss_raids (id, slot_hour, status, max_hp, hp, starts_at, ends_at)
     VALUES ($1,$2,'active',$3,$3,$4,$5)`,
    [id, slot.hour, Math.min(slot.hp, 50_000), starts.toISOString(), ends.toISOString()],
  );
  await redis.set(`boss:hp:${id}`, String(Math.min(slot.hp, 50_000)));
  return getBossPublic();
}
