import { Bot } from '@maxhub/max-bot-api';
import { bossSlots } from '@pb/shared';
import { nextBossStartsAt } from '../services/boss.js';
import { maxClientOptions } from '../bot/tls.js';

/** Reminder messages for Max bot (T-5m). */
export function buildBossReminder() {
  const { startsAt, hour } = nextBossStartsAt();
  const slot = bossSlots.find((s) => s.hour === hour)!;
  return {
    text: `Через 5 минут общий бой с боссом (${hour}:00 МСК)! HP ${slot.hp.toLocaleString('ru-RU')}. Открывай шахту и бей вместе со всеми.`,
    startsAt,
    hour,
  };
}

export function buildWelcomeMessage() {
  return 'Привет! Я проводник Подземных богатств. Заходи в шахту — через пару минут начнётся общий бой с боссом.';
}

export function buildRaidSummary(place: number, damage: number, soft: number, xp: number) {
  return `Итоги боя: место #${place}, урон ${damage.toLocaleString('ru-RU')}. Награда: ${soft} ◎ и ${xp} XP.`;
}

function getApi() {
  const token = process.env.MAX_BOT_TOKEN;
  if (!token) return null;
  return new Bot(token, { clientOptions: maxClientOptions() }).api;
}

export async function sendMaxMessage(userId: string | number, text: string) {
  const api = getApi();
  if (!api) {
    console.log('[bot:dry-run]', text);
    return { ok: true, dryRun: true };
  }
  const miniAppUrl = process.env.MAX_MINIAPP_URL || process.env.WEB_ORIGIN || 'http://localhost:5173';
  const message = await api.sendMessageToUser(Number(userId), text, {
    attachments: [
      {
        type: 'inline_keyboard',
        payload: {
          buttons: [[{ type: 'link', text: '⛏ Открыть шахту', url: miniAppUrl }]],
        },
      },
    ],
  });
  return { ok: true, message };
}

export async function getBotMe() {
  const api = getApi();
  if (!api) return null;
  return api.getMyInfo();
}
