import 'dotenv/config';
import { openSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bot, Keyboard } from '@maxhub/max-bot-api';
import { buildBossReminder, buildWelcomeMessage } from '../services/bot.js';
import { maxClientOptions } from './tls.js';

const lockPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.bot.lock');
try {
  const fd = openSync(lockPath, 'wx');
  writeFileSync(fd, String(process.pid));
} catch {
  console.error('[max-bot] already running (lock file). Stop the other process first.');
  process.exit(1);
}
const clearLock = () => {
  try {
    if (existsSync(lockPath)) unlinkSync(lockPath);
  } catch {
    /* ignore */
  }
};
process.on('exit', clearLock);
process.on('SIGINT', () => {
  clearLock();
  process.exit(0);
});
process.on('SIGTERM', () => {
  clearLock();
  process.exit(0);
});

const token = process.env.MAX_BOT_TOKEN;
if (!token) {
  clearLock();
  console.error('MAX_BOT_TOKEN is empty — set it in apps/api/.env');
  process.exit(1);
}

const miniAppUrl = process.env.MAX_MINIAPP_URL || process.env.WEB_ORIGIN || 'http://localhost:5173';

const bot = new Bot(token, { clientOptions: maxClientOptions() });

bot.catch((err) => {
  console.error('[max-bot] handler error', err);
});

function openGameKeyboard() {
  return Keyboard.inlineKeyboard([
    [
      {
        type: 'link',
        text: '⛏ Открыть шахту',
        url: miniAppUrl,
      },
    ],
  ]);
}

async function sendWelcome(ctx: { reply: (text: string, extra?: object) => Promise<unknown> }) {
  await ctx.reply(buildWelcomeMessage(), {
    attachments: [openGameKeyboard()],
  });
}

bot.command('start', async (ctx) => {
  await sendWelcome(ctx);
});

bot.on('bot_started', async (ctx) => {
  await sendWelcome(ctx);
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    'Подземные богатства — idle-шахта в Max.\n\nКоманды:\n/start — приветствие\n/boss — когда следующий бой\n/help — помощь',
    { attachments: [openGameKeyboard()] },
  );
});

bot.command('boss', async (ctx) => {
  const rem = buildBossReminder();
  const when = new Date(rem.startsAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  await ctx.reply(`${rem.text}\nСтарт (МСК): ${when}`, {
    attachments: [openGameKeyboard()],
  });
});

bot.on('message_created', async (ctx) => {
  const text = ctx.message?.body?.text?.trim().toLowerCase() ?? '';
  if (!text || text.startsWith('/')) return;
  if (text.includes('босс') || text.includes('boss')) {
    const rem = buildBossReminder();
    await ctx.reply(rem.text, { attachments: [openGameKeyboard()] });
    return;
  }
  await ctx.reply('Напиши /start или нажми кнопку, чтобы открыть шахту.', {
    attachments: [openGameKeyboard()],
  });
});

try {
  await bot.api.setMyCommands([
    { name: 'start', description: 'Открыть шахту' },
    { name: 'boss', description: 'Ближайший бой с боссом' },
    { name: 'help', description: 'Помощь' },
  ]);
} catch (e) {
  console.warn('[max-bot] setMyCommands failed', e);
}

const me = await bot.api.getMyInfo();
console.log(`[max-bot] online as @${me.username ?? me.name} (id ${me.user_id})`);
console.log('[max-bot] long polling… напиши боту /start в Max');
await bot.start({ mode: 'polling' });
