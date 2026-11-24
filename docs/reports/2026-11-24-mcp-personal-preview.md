# MCP Preview setup — личная инфраструктура (2026-11-24)

> Статус: подготовка инфраструктуры, **не** подключённый ChatGPT. Не применять к production.
> Создано исключительно в личной команде Vercel `diamond-dogs2`, подтверждённой владельцем проекта.
> Рабочая ветка: `feat/ai-workspace-mcp-foundation`, PR #34 (Draft).

## Подтверждённые ресурсы

| Объект | Подтверждённое состояние |
| --- | --- |
| GitHub | `Human-Unit/IPOS.Plan`, PR #34 Draft |
| Vercel project | `ipos-plan` (`prj_X02m4Lt0HO61JlUfyFcKWVMUILu5`) |
| Vercel team | `Diamond Dogs`, `diamond-dogs2` |
| Новый Blob | `ipos-plan-ai-private` (`store_B6w8RsQt4RyY6BKi`), **private**, регион `fra1`, пустое |
| Blob → project | **Ещё не привязан**. Не подставлять существующий `BLOB_READ_WRITE_TOKEN` публикаций |
| Stable Preview alias | `ipos-plan-git-feat-ai-workspace-mcp-foundation-diamond-dogs2.vercel.app` |
| Preview `IPOS_MCP_AUTH_MODE` | `oauth`, только `feat/ai-workspace-mcp-foundation` |
| Preview `IPOS_MCP_RESOURCE_URL` | `https://ipos-plan-git-feat-ai-workspace-mcp-foundation-diamond-dogs2.vercel.app/api/mcp`, только указанная ветка |
| OAuth provider | **Не настроен**. В OAuth-режиме MCP должен отклонять запросы до полной конфигурации |
| GitHub CI | PASS на коммите `0a694a4` до изменения preview env |

Обнаружены и сохранены ранее существовавшие project environment variables:
`IPOS_ADMIN_PASSWORD`, `IPOS_ADMIN_SESSION_SECRET`,
`IPOS_PUBLISH_ACCESS_KEY`, `BLOB_READ_WRITE_TOKEN`.
Значения секретов **не читались и не копировались**.

## Ручное подключение приватного Blob

Прямой инструмент привязки уже созданного Blob к проекту отсутствует в
подключённом API. Существует риск: стандартная привязка Vercel Blob
автоматически добавляет `BLOB_READ_WRITE_TOKEN`, который уже используется
для публикаций. **Не выполняйте подключение без проверки имени переменной.**

1. Откройте Vercel → Team **Diamond Dogs** → Storage → существующее
   **ipos-plan-ai-private**. Не создавайте второе хранилище.
2. Откройте вкладку **Projects** и действие подключения проекта `ipos-plan`.
3. В расширенных настройках (если доступны) укажите **префикс `IPOS_AI`**,
   чтобы итоговая переменная была **`IPOS_AI_BLOB_READ_WRITE_TOKEN`**.
   Важно проверить имя в итоговом preview *до сохранения*.
4. Выберите только **Preview**. Если UI позволяет ограничить конкретную
   ветку, выберите `feat/ai-workspace-mcp-foundation`. Если привязка
   создаёт переменную сразу во всех Preview-ветках, обсудите более узкую
   привязку через Settings → Environment Variables или отдельный test project.
5. После привязки проверьте `Settings → Environment Variables`: токен
   должен находиться **только** в разрешённом тестовом окружении;
   исходный `BLOB_READ_WRITE_TOKEN` публикаций не должен измениться.
6. Проверьте metadata самого store: Projects теперь показывает связь,
   данные остаются пустыми до первого разрешённого теста.

При отсутствии безопасной настройки префикса и окружения **остановитесь**.
Лучше вручную создать отдельную Secret-переменную
`IPOS_AI_BLOB_READ_WRITE_TOKEN` только для нужной Preview-ветки через Vercel UI,
не раскрывая токен ассистенту, чем менять существующую переменную.

Официальная документация:
[Private Blob Storage](https://vercel.com/docs/vercel-blob/private-storage),
[Environment Variables](https://vercel.com/docs/environment-variables),
[Using Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk).

## Подключение личного OAuth-провайдера

В коде уже реализован только OAuth **resource server**. Для ChatGPT нужен
отдельный личный OAuth authorization server, поддерживающий Authorization
Code + PKCE S256, discovery, CIMD или DCR, scopes и introspection. Для
воспроизводимого теста провайдер должен выдавать `iss`, `aud`, `sub`,
`exp`, `client_id`, `scope` и `active`, согласно
`src/lib/ai-workspace/oauth.ts`.

**Не используйте** данные корпоративного OAuth tenant и не создавайте
токены для сторонних пользователей. Не копируйте секреты в Issue/PR/чат.

В `Settings → Environment Variables` для личной Preview-ветки заполнить:

- `IPOS_MCP_OAUTH_ISSUER`
- `IPOS_MCP_OAUTH_INTROSPECTION_URL`
- `IPOS_MCP_OAUTH_CLIENT_ID`
- `IPOS_MCP_OAUTH_CLIENT_SECRET` (**Secret**)
- `IPOS_MCP_OAUTH_OWNER_SUB`

Убедитесь, что провайдер использует ожидаемый **точный** OAuth audience:
`IPOS_MCP_RESOURCE_URL`. Некоторые провайдеры не выдают пользовательский
URL в `aud` по умолчанию, поэтому их настройку нужно проверить в документации
и реальной интроспекции; **не отключайте** проверку audience ради теста.

Проверка метаданных и запрета анонимного доступа после preview deploy:

```bash
npm run mcp:preflight -- --url https://ipos-plan-git-feat-ai-workspace-mcp-foundation-diamond-dogs2.vercel.app/api/mcp
```

Если preview защищён Vercel Authentication, инструмент preflight может
получить редирект/401 платформы вместо MCP и вернуть FAIL. Не отключайте
защиту без отдельной оценки рисков.

После успешного preflight отдельно выполните реальное OAuth-подключение
в ChatGPT Plugins, начните с `ipos_list_plans` и `ipos_get_plan`,
а затем проверьте запись на **тестовом** плане и её подтверждённый импорт.
Проверить revoke/expired/wrong audience/conflict и логи без секретов.

## Критерии перед merge

- [ ] Новый Blob подключён только к нужному Preview, старый token сохранён
- [ ] Личный OAuth-провайдер подтверждён, `aud/sub/scopes` проверены
- [ ] HTTPS и OAuth resource metadata доступны из MCP-клиента
- [ ] Доступ без OAuth запрещён, чтение/запись разграничены
- [ ] Реальный Streamable HTTP MCP Inspector / ChatGPT тест выполнен
- [ ] Сценарий Reels: создание, назначение, ссылка, отсутствие дедлайна
- [ ] Конфликт версии и повтор запросов проверены на **тестовом** private Blob
- [ ] Импорт не перезаписывает локальные планы, предыдущая версия сохранена
- [ ] Production, публикации, исходные пользовательские планы не затронуты
