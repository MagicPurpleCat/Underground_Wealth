# Project Passport

> Краткий паспорт проекта. Не более 200 строк.
> Обновляется при значимых изменениях архитектуры, стека, структуры.

## Название проекта
Подземные богатства

## Назначение
Idle-шахта в мессенджере Max (Mini App): добыча руды, помощники, навыки, квесты, престиж и общие серверные боссы 3 раза в день. Бот Max — онбординг и напоминания о боях.

## Технологический стек
- **Язык:** TypeScript
- **Фреймворк:** Vite + React 19 (web), Fastify 5 (api), `@maxhub/max-bot-api` (бот)
- **База данных:** Postgres 16 + Redis 7
- **Инфраструктура:** Docker Compose (локально), pnpm workspaces
- **CI/CD:** —
- **Прочее:** Tailwind 4 + shadcn, `@pb/shared` (формулы/баланс), Twemoji CDN

## Структура проекта
```
Подземные богатства/
├── apps/web/          # Mini App (Vite React)
├── apps/api/          # Fastify API + bot (src/bot/run.ts)
├── packages/shared/   # типы, формулы, конфиги шахт
├── assets/brand/      # логотипы
├── assets/game/       # руды и фоны шахт
├── docker-compose.yml
├── project-passport.md / project-decision.md / gotchas.md / BUGS.md / STYLE.md / todo.md
└── README.md
```

## Точки входа
- **Главный модуль:** `apps/web/src/main.tsx`
- **API:** `apps/api/src/index.ts` → `:3001`
- **CLI:** `pnpm bot` → `apps/api/src/bot/run.ts`
- **Тесты:** —

## Ключевые модули
| Модуль | Назначение |
|--------|-----------|
| `apps/web` | UI шахты, босс, табы, FX/звуки |
| `apps/api` | auth Max, dig/prestige/quests, Boss Raid WS |
| `packages/shared` | баланс, mines/helpers/skills/quests |
| `apps/api/src/bot` | long polling Max-бота |

## Внешние зависимости
- Max Bot API (`platform-api2.max.ru`) — нужен CA Минцифры (`apps/api/certs/`)
- Twemoji CDN (jdecked/twemoji)
- Публичный HTTPS для Mini App (туннель/деплой) — localhost Max не принимает

## Переменные окружения
| Переменная | Назначение | Обязательная? |
|------------|-----------|---------------|
| `DATABASE_URL` | Postgres | да |
| `REDIS_URL` | Redis (босс HP) | да |
| `JWT_SECRET` | сессии игрока | да |
| `MAX_BOT_TOKEN` | токен бота Max (только `.env`) | да для бота |
| `MAX_APP_SECRET` | HMAC initData | для прода |
| `MAX_MINIAPP_URL` | ссылка Mini App в кнопках бота | да для бота |
| `WEB_ORIGIN` | CORS | да |
| `PORT` | API порт (3001) | нет |

## Команды
- **Запуск:** `docker compose -p pb up -d && pnpm db:migrate && pnpm dev`
- **Бот:** `pnpm bot` (один процесс; lock `apps/api/.bot.lock`)
- **Тесты:** —
- **Сборка:** `pnpm --filter @pb/web build`
- **Деплой:** нужен публичный HTTPS (Vercel и т.п. или туннель)

## Контакты / ответственные
Владелец продукта / разработка — локальный workspace.

---
_Последнее обновление: 2026-10-02_
