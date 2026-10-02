import type { FastifyInstance, FastifyRequest } from 'fastify';
import { helpers, mines, quests, skillTree, tutorials, bossSlots } from '@pb/shared';
import { issueToken, parseMaxInitData, verifyToken } from '../auth/max.js';
import * as playerService from '../services/player.js';
import * as bossService from '../services/boss.js';
import { pool } from '../db/pool.js';

async function authUser(req: FastifyRequest) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');
  return verifyToken(header.slice(7));
}

export async function registerRoutes(app: FastifyInstance) {
  // schedule bot reminders loosely via lifecycle; dedicated endpoint for ops
  app.get('/bot/reminder-preview', async () => {
    const { buildBossReminder, buildWelcomeMessage } = await import('../services/bot.js');
    return { welcome: buildWelcomeMessage(), reminder: buildBossReminder() };
  });

  app.get('/config', async () => ({
    mines,
    helpers,
    skillTree,
    quests,
    tutorials,
    bossSlots,
  }));

  app.post<{ Body: { initData?: string } }>('/auth/max', async (req, reply) => {
    const parsed = parseMaxInitData(req.body?.initData ?? '');
    if (!parsed) return reply.code(401).send({ error: 'INVALID_INIT_DATA' });
    const state = await playerService.ensurePlayer(parsed.userId, parsed.displayName);
    const token = await issueToken(parsed.userId, parsed.displayName);
    await pool.query(
      `INSERT INTO analytics_events (max_user_id, event_name, payload) VALUES ($1,'session_start','{}')`,
      [parsed.userId],
    );
    return { token, player: state };
  });

  app.get('/me', async (req, reply) => {
    try {
      const user = await authUser(req);
      const player = await playerService.getPlayer(user.userId);
      if (!player) return reply.code(404).send({ error: 'NOT_FOUND' });
      return { player };
    } catch {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }
  });

  app.post('/dig', async (req, reply) => {
    try {
      const user = await authUser(req);
      const player = await playerService.dig(user.userId);
      return { player };
    } catch (e) {
      return reply.code(400).send({ error: String((e as Error).message) });
    }
  });

  app.post('/convert', async (req, reply) => {
    try {
      const user = await authUser(req);
      return await playerService.convertOre(user.userId);
    } catch (e) {
      return reply.code(400).send({ error: String((e as Error).message) });
    }
  });

  app.post<{ Body: { key: 'pickaxe' | 'speed' | 'capacity' | 'multiplier' } }>('/upgrade', async (req, reply) => {
    try {
      const user = await authUser(req);
      const player = await playerService.buyUpgrade(user.userId, req.body.key);
      return { player };
    } catch (e) {
      return reply.code(400).send({ error: String((e as Error).message) });
    }
  });

  app.post<{ Body: { helperId: string } }>('/helpers/buy', async (req, reply) => {
    try {
      const user = await authUser(req);
      const player = await playerService.buyHelper(user.userId, req.body.helperId);
      return { player };
    } catch (e) {
      return reply.code(400).send({ error: String((e as Error).message) });
    }
  });

  app.post<{ Body: { skillId: string } }>('/skills/unlock', async (req, reply) => {
    try {
      const user = await authUser(req);
      const player = await playerService.unlockSkill(user.userId, req.body.skillId);
      return { player };
    } catch (e) {
      return reply.code(400).send({ error: String((e as Error).message) });
    }
  });

  app.post<{ Body: { mineId: number } }>('/mines/unlock', async (req, reply) => {
    try {
      const user = await authUser(req);
      const player = await playerService.unlockMine(user.userId, req.body.mineId);
      await pool.query(
        `INSERT INTO analytics_events (max_user_id, event_name, payload) VALUES ($1,'mine_unlock',$2::jsonb)`,
        [user.userId, JSON.stringify({ mineId: req.body.mineId })],
      );
      return { player };
    } catch (e) {
      return reply.code(400).send({ error: String((e as Error).message) });
    }
  });

  app.post('/prestige', async (req, reply) => {
    try {
      const user = await authUser(req);
      const player = await playerService.prestige(user.userId);
      await pool.query(
        `INSERT INTO analytics_events (max_user_id, event_name, payload) VALUES ($1,'prestige','{}')`,
        [user.userId],
      );
      return { player };
    } catch (e) {
      return reply.code(400).send({ error: String((e as Error).message) });
    }
  });

  app.post<{ Body: { questId: string } }>('/quests/claim', async (req, reply) => {
    try {
      const user = await authUser(req);
      const player = await playerService.claimQuest(user.userId, req.body.questId);
      return { player };
    } catch (e) {
      return reply.code(400).send({ error: String((e as Error).message) });
    }
  });

  app.post<{ Body: { tutorialId: string } }>('/tutorials/seen', async (req, reply) => {
    try {
      const user = await authUser(req);
      const player = await playerService.markTutorialSeen(user.userId, req.body.tutorialId);
      return { player };
    } catch (e) {
      return reply.code(400).send({ error: String((e as Error).message) });
    }
  });

  app.get('/boss', async (req, reply) => {
    try {
      const user = await authUser(req).catch(() => null);
      return await bossService.getBossPublic(user?.userId);
    } catch (e) {
      return reply.code(500).send({ error: String((e as Error).message) });
    }
  });

  app.post('/boss/hit', async (req, reply) => {
    try {
      const user = await authUser(req);
      const boss = await bossService.hitBoss(user.userId, user.displayName);
      await pool.query(
        `INSERT INTO analytics_events (max_user_id, event_name, payload) VALUES ($1,'boss_hit','{}')`,
        [user.userId],
      );
      return { boss };
    } catch (e) {
      return reply.code(400).send({ error: String((e as Error).message) });
    }
  });

  app.get('/boss/history', async (req, reply) => {
    try {
      const user = await authUser(req);
      return { history: await bossService.recentRaids(user.userId) };
    } catch {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }
  });

  app.post('/dev/boss/start', async (_req, reply) => {
    if (process.env.NODE_ENV === 'production') return reply.code(404).send();
    return { boss: await bossService.forceStartRaidDev() };
  });

  // Max bot webhook stub
  app.post('/bot/webhook', async (req) => {
    app.log.info({ body: req.body }, 'bot webhook');
    return { ok: true };
  });

  app.get('/shop', async () => ({
    enabled: false,
    items: [],
    message: 'Магазин появится позже. В v1 — только soft и престиж.',
  }));
}
