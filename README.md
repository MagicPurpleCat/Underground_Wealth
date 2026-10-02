# Подземные богатства

Idle-шахта в Max Messenger (Mini App) + бот уведомлений.

## Стек

- `apps/web` — Vite + React + TS + Tailwind + shadcn
- `apps/api` — Fastify + Postgres + Redis
- `packages/shared` — типы, формулы, баланс-конфиг

## Быстрый старт

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001/health  

Dev-вход в Mini App: кнопка «Войти (dev)» (initData `dev:<id>:<name>`).

## Amvera

Прод: Docker (`amvera.yaml` + `Dockerfile`), Postgres и Redis — отдельные managed-сервисы.
Инструкция: [docs/amvera.md](docs/amvera.md).

## Бренд

Ассеты в `assets/brand/`:
- `logo-podzemnye-bogatstva-with-bg.jpg` — каталог Max / аватар бота
- `logo-podzemnye-bogatstva-no-bg.jpg` — splash / UI
