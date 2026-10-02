import 'dotenv/config';
import { Bot } from '@maxhub/max-bot-api';
import { maxClientOptions } from './tls.js';

const token = process.env.MAX_BOT_TOKEN;
if (!token) {
  console.error('no token');
  process.exit(1);
}

const bot = new Bot(token, { clientOptions: maxClientOptions() });
const me = await bot.api.getMyInfo();
console.log(
  JSON.stringify({
    username: me.username,
    name: me.name,
    user_id: me.user_id,
    is_bot: me.is_bot,
  }),
);
