# TODO — задачи в работе и планы

> Файл только для добавления. Старые задачи НЕ удалять.
> Статус меняется через update_todo_status.
> Статусы: TODO, IN_PROGRESS, DONE, CANCELLED

---

## [2026-10-02] TASK-001 [DONE]
**Задача:** Заполнить паспорт проекта (project-passport.md)
**Приоритет:** HIGH
**Описание:** Внести реальную информацию о проекте в шаблон паспорта.

## [2026-10-02] TASK-002 [TODO]
**Задача:** Настроить .cursor/mcp.json
**Приоритет:** HIGH
**Описание:** Указать путь к mcp_long_memory.py в конфигурации Cursor.

## [2026-10-02] TASK-003 [DONE]
**Задача:** Описать правила стиля в STYLE.md
**Приоритет:** MEDIUM
**Описание:** Зафиксировать конвенции по коду, коммитам, неймингу.

## [2026-10-02] TASK-004 [DONE]
**Задача:** Скелет монорепо + ядро игры v1
**Приоритет:** CRITICAL
**Описание:** pnpm workspaces, web/api/shared, docker, dig/upgrades/helpers/skills/quests/prestige/boss.

## [2026-10-02] TASK-005 [TODO]
**Задача:** Мини-бот модалка при открытии шахты 2 + прод Max initData HMAC
**Приоритет:** HIGH
**Описание:** Chat-bubble tutorial UI; проверить подпись initData по гайду Max 2026.

## [2026-10-02] TASK-006 [DONE]
**Задача:** Реальная отправка сообщений бота Max (T−5м / итоги)
**Приоритет:** HIGH
**Описание:** Бот на @maxhub/max-bot-api + polling; T−5м cron/напоминания ещё частично (команда /boss есть).

## [2026-10-02] TASK-007 [IN_PROGRESS]
**Задача:** Стабильный HTTPS деплой Mini App
**Приоритет:** CRITICAL
**Описание:** Amvera: Dockerfile + amvera.yaml в репо; нужны проекты PG/Redis/app в панели и HTTPS URL в Max. См. docs/amvera.md.

## [2026-10-02] TASK-008 [DONE]
**Задача:** Конфиги Amvera в репозитории
**Приоритет:** HIGH
**Описание:** Dockerfile, amvera.yaml, entrypoint, статика Fastify, docs/amvera.md.

---

### Шаблон новой записи:
```
## [YYYY-MM-DD] TASK-XXX [TODO]
**Задача:** краткое название
**Приоритет:** LOW / MEDIUM / HIGH / CRITICAL
**Описание:** детали
```
