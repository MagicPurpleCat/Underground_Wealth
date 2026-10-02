import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { registerRoutes } from './routes/index.js';
import { tickBossLifecycle, getBossPublic, hitBoss } from './services/boss.js';
import { verifyToken } from './auth/max.js';
import { redis } from './db/redis.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? true,
});
await app.register(websocket);

app.get('/health', async () => ({ ok: true }));

await app.register(async (api) => {
  await registerRoutes(api);
}, { prefix: '/api' });

await app.register(async (instance) => {
  instance.get('/ws/boss', { websocket: true }, (socket) => {
    let userId: string | undefined;
    let displayName = 'Шахтёр';

    socket.on('message', async (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const msg = JSON.parse(String(raw)) as { type: string; token?: string };
        if (msg.type === 'auth' && msg.token) {
          const user = await verifyToken(msg.token);
          userId = user.userId;
          displayName = user.displayName;
          const boss = await getBossPublic(userId);
          socket.send(JSON.stringify({ type: 'boss', boss }));
          return;
        }
        if (msg.type === 'hit') {
          if (!userId) {
            socket.send(JSON.stringify({ type: 'error', error: 'UNAUTHORIZED' }));
            return;
          }
          const boss = await hitBoss(userId, displayName);
          socket.send(JSON.stringify({ type: 'boss', boss }));
          return;
        }
        if (msg.type === 'sync') {
          const boss = await getBossPublic(userId);
          socket.send(JSON.stringify({ type: 'boss', boss }));
        }
      } catch (e) {
        socket.send(JSON.stringify({ type: 'error', error: String((e as Error).message) }));
      }
    });

    const iv = setInterval(async () => {
      try {
        const boss = await getBossPublic(userId);
        socket.send(JSON.stringify({ type: 'boss', boss }));
      } catch {
        /* ignore */
      }
    }, 2000);

    socket.on('close', () => clearInterval(iv));
  });
});

const webDist =
  process.env.WEB_DIST ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');

if (fs.existsSync(webDist)) {
  await app.register(fastifyStatic, {
    root: webDist,
    prefix: '/',
    wildcard: false,
  });
  app.setNotFoundHandler((req, reply) => {
    if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/ws')) {
      return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: 'NOT_FOUND' });
  });
  app.log.info({ webDist }, 'Serving Mini App static');
} else {
  app.log.warn({ webDist }, 'WEB_DIST missing — API-only mode');
}

const port = Number(process.env.PORT ?? 3001);

try {
  await redis.connect();
} catch (e) {
  app.log.warn({ e }, 'Redis connect deferred');
}

setInterval(() => {
  tickBossLifecycle().catch((err) => app.log.error(err));
}, 15_000);

await app.listen({ port, host: '0.0.0.0' });
app.log.info(`API on :${port}`);
