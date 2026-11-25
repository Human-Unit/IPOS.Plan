# IPOS.Plan

Локально-ориентированное рабочее пространство медиасектора: контент-планы, производственные брифы, задачи, исполнители, дедлайны, версии, публикации и экспорт документов.

**Production:** https://ipos-plan.vercel.app · Vercel: `diamond-dogs2/ipos-plan` · основная ветка: `main`.

## Возможности и границы

- Dashboard Cobalt & Ink: поиск по планам и задачам, фильтры, прогресс, последние изменения, импорт и резервные копии.
- BlockNote: редактируемый документ и рабочее пространство, задания, референсы, изображения, инспектор, outline, история и восстановление.
- JSON schemaVersion 1, DOCX, A4 print/PDF, неизменяемые снимки `/view#p=…`, именованные публикации `/p/[id]`.
- Локальные данные хранятся в IndexedDB (Dexie); сервер не получает все планы автоматически. Админка защищена отдельной сессией владельца, но сама по себе не переносит локальные документы между устройствами.
- Серверные публикации используют существующий Blob store. Опциональная GPT-синхронизация и MCP используют **другое приватное хранилище**, отдельную авторизацию и проверку версий. Код интеграции присутствует; реальное подключение ChatGPT отложено до настройки приватного Blob, личного OAuth и сквозных проверок. Не включайте legacy token mode для обхода OAuth.
- Не является многопользовательской облачной системой. Справочник собранных имён не равен полноценному управлению участниками и ролями.

## Запуск

Node.js **24.x** (как Vercel и CI), npm с зафиксированным lockfile.

```sh
npm ci
npm run dev
```

Откройте http://127.0.0.1:3105. Для production-подобной сборки:

```sh
npm run build
npm start
```

Локальный редактор работает без серверных секретов. Данные IndexedDB привязаны к origin, браузеру и профилю; localhost и production имеют разные библиотеки. Сделайте резервную копию перед переносом или очисткой данных сайта.

## Серверное окружение

| Переменная | Назначение |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Существующее хранилище публикаций; не заменять приватным токеном |
| `IPOS_PUBLISH_ACCESS_KEY` | Авторизация публикаций |
| `IPOS_ADMIN_PASSWORD`, `IPOS_ADMIN_SESSION_SECRET` | Вход владельца и подпись cookie |
| `IPOS_AI_BLOB_READ_WRITE_TOKEN` | Отдельный приватный Blob; пока не подключён |
| `IPOS_MCP_AUTH_MODE=oauth` | Закрытый OAuth-режим в production |
| `IPOS_MCP_RESOURCE_URL`, `IPOS_MCP_OAUTH_*` | Публичный ресурс и личный OAuth-провайдер; см. инструкцию |

Секреты задаются в Vercel или локально в игнорируемом `.env.local`, не в Git и не в `NEXT_PUBLIC_*`. Preview должен использовать изолированные тестовые данные; никогда не ослабляйте авторизацию для проверки. См. [ADMIN](docs/ADMIN.md), [MCP](docs/CHATGPT_MCP.md).

## Структура

| Каталог | Ответственность |
| --- | --- |
| `src/app` | Routes, layouts, CSS, API и metadata |
| `src/components/editor` | BlockNote, renderer, брифы и inspector |
| `src/features/plans` | Dashboard, редактор, repository, autosave |
| `src/features/ai-sync` | Явная отправка / получение облачной версии |
| `src/features/sharing` | Публикации и read-only viewer |
| `src/features/export`, `src/features/backup` | Экспорт и резервные копии |
| `src/lib/db`, `src/lib/schema` | IndexedDB и контракты данных |
| `src/lib/ai-workspace` | Приватное хранилище, OAuth и MCP tools |
| `tests/unit`, `tests/e2e` | Unit, интеграционные моки и Chromium |

## Проверки

```sh
npm run lint
npm run typecheck
npm test
npm run mcp:preflight:test
npm run build
npx playwright install chromium
npm run test:e2e
```

CI выполняет эти проверки, независимую проверку ZIP/OOXML и Playwright на собранном приложении. Для локальной проверки production-сборки используйте режим CI. Моки не подтверждают работу личного OAuth или приватного Blob. Не используйте реальные планы для интеграционных тестов.

## Разработка и релизы

- Работайте в отдельной ветке и открывайте PR в main; CI запускается для любого PR и push в main.
- Проверяйте CI и Vercel Preview до merge. Main — источник релизов; не продвигайте произвольные Preview на production.
- Сохраняйте историю Git и проверяйте предыдущий READY deployment для rollback. После релиза проверьте публичные страницы и закрытый MCP без токена.
- Не изменяйте существующие публикации, схемы данных и секреты без отдельного согласования.

## Документация

[Архитектура](docs/ARCHITECTURE.md) · [Portable schema](docs/PLAN_SCHEMA.md) · [Версия 3.0](docs/IPOS_PLAN_3.md) · [3.1](docs/IPOS_PLAN_3_1.md) · [3.2](docs/IPOS_PLAN_3_2.md) · [Админка](docs/ADMIN.md) · [MCP](docs/CHATGPT_MCP.md) · [Дизайн Cobalt](docs/design/COBALT_APPROVED.md) · [Design playbook](docs/design/IPOS_DESIGN_PLAYBOOK.md) · [Правила для агентов](AGENTS.md).

Исторический README и подробные результаты старых QA сохранены в [коммите b8f1cd0](https://github.com/Human-Unit/IPOS.Plan/blob/b8f1cd008c8996a4cca9f31fd5748d96898e23f9/README.md). Актуальные результаты тестов берите из GitHub Actions для конкретного SHA.
