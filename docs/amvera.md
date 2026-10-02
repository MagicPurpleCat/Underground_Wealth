# Деплой на Amvera

Схема: **1 приложение** (Mini App + API + бот) + managed **PostgreSQL** + managed **Redis**.
`docker-compose` на Amvera не поддерживается.

## Проекты в панели

Создайте в [cloud.amvera.ru](https://cloud.amvera.ru/projects):

| Проект | Тип | Назначение |
|--------|-----|------------|
| `underground-wealth` | Приложение (Docker) | этот репозиторий |
| `underground-pg` | PostgreSQL | игровая БД |
| `underground-redis` | Redis | HP босса / runtime |

## Приложение

1. Тип окружения: Docker (в репо уже есть [`amvera.yaml`](../amvera.yaml) + [`Dockerfile`](../Dockerfile)).
2. Вкладка **Репозиторий** → подключить GitHub `MagicPurpleCat/Underground_Wealth`, ветка `main`, webhook.
3. **Настройки → Доменные имена** → бесплатный HTTPS-домен Amvera (нужен Max Mini App).
4. После деплоя URL вида `https://underground-wealth-….amvera.io` → вставить в Max как Mini App URL.

## Переменные (секреты) приложения

| Имя | Пример / откуда |
|-----|-----------------|
| `DATABASE_URL` | `postgres://USER:PASS@INTERNAL_HOST:5432/DB` (Инфо Postgres) |
| `REDIS_URL` | `redis://:PASSWORD@INTERNAL_HOST:6379` (Инфо Redis; пароль через `REDIS_ARGS`) |
| `JWT_SECRET` | длинная случайная строка |
| `MAX_BOT_TOKEN` | токен бота Max |
| `MAX_APP_SECRET` | секрет Mini App (HMAC initData) |
| `WEB_ORIGIN` | ваш HTTPS URL приложения |
| `MAX_MINIAPP_URL` | тот же HTTPS URL |
| `PORT` | `80` (уже в образе; можно не задавать) |
| `WEB_DIST` | `/app/web` (уже в образе) |

Внутренний host Amvera выглядит как `amvera-<user>-cnpg-<project>-rw` (Postgres) / `amvera-<user>-run-<project>` (Redis) — точное значение на вкладке **Инфо**.

## После первого деплоя

1. Дождаться статуса «Успешно развернуто».
2. Открыть `https://<домен>/health` → `{"ok":true}`.
3. Открыть корень домена — Mini App.
4. В Max: URL Mini App = HTTPS домен; боту написать `/start`.

## Локальная проверка образа

```bash
docker build -t pb-amvera .
docker run --rm -p 8080:80 --env-file .env -e PORT=80 -e WEB_DIST=/app/web pb-amvera
```

(Postgres/Redis должны быть доступны из контейнера по `DATABASE_URL` / `REDIS_URL`.)
