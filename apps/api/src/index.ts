import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { registerRoutes } from './routes/index.js';
import { tickBossLifecycle, getBossPublic, hitBoss } from './services/boss.js';
import { verifyToken } from './auth/max.js';
import { redis } from './db/redis.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? true,
});
await app.register(websocket);

await registerRoutes(app);

app.register(async (instance) => {
  instance.get('/ws/boss', { websocket: true }, (socket, req) => {
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
