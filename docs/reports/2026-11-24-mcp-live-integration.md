# Подключение ChatGPT ↔ IPOS.Plan через личный OAuth-провайдер

Дата: 2026-11-24. **Не считать подключённым до ручного входа и сквозного теста.**

## Подтверждённая конфигурация

- GitHub: личный `Human-Unit/IPOS.Plan`
- Vercel: личная команда `Diamond Dogs`, проект `ipos-plan`
- Production MCP resource URL: `https://ipos-plan.vercel.app/api/mcp`
- Production `IPOS_MCP_AUTH_MODE=oauth` и `IPOS_MCP_RESOURCE_URL` заданы как **не-секретные** переменные; OAuth останется недоступен до полной конфигурации
- Отдельное приватное Blob-хранилище `ipos-plan-ai-private`, ID `store_B6w8RsQt4RyY6BKi`, создано, **но ещё не связано с проектом**
- Существующий `BLOB_READ_WRITE_TOKEN` используется публичными публикациями; **не изменять и не подменять**
- Нет подтверждённого личного OAuth tenant; **не подключать корпоративную авторизацию**

## 1. Подключить именно приватное Blob

1. Открыть `Vercel → Diamond Dogs → Storage → ipos-plan-ai-private → Projects → Connect`.
2. Выбрать проект `ipos-plan`. В расширенных настройках задать префикс имени переменной, чтобы получилась **`IPOS_AI_BLOB_READ_WRITE_TOKEN`**, а не `BLOB_READ_WRITE_TOKEN`. Указать Production и, при необходимости, Preview соответствующей ветки.
3. **До подтверждения** проверить список изменений. Если интерфейс перезаписывает `BLOB_READ_WRITE_TOKEN` публикаций или нельзя получить отдельное имя переменной — отменить подключение. Допустимая альтернатива: вручную добавить отдельную секретную переменную в Vercel Settings, прочитав значение токена *только внутри личного Vercel Dashboard*.
4. Убедиться в Vercel Settings → Environment Variables, что новые и старые имена существуют отдельно. Не публиковать их значения и не читать в логах.
5. Перед тестами обновить deployment; переменные Vercel не ретроактивны для уже опубликованных функций.

Вместо долговременного Blob-токена можно позже перейти на штатный OIDC режим Vercel Blob, при условии что `storeId`, права и текущая реализация `storageOptions()` будут явно адаптированы и протестированы. **Не подставлять public Blob как fallback.** Документация: https://vercel.com/changelog/vercel-blob-now-supports-oidc-authentication

## 2. Личный OAuth Authorization Server

Рекомендуемая готовая реализация — **Descope MCP Server Resource**. Она управляет OAuth 2.1, Authorization Code с PKCE S256, Client ID Metadata Documents (CIMD) / DCR, consent и ресурсными scopes. Это **отдельный личный внешний аккаунт**, который владелец должен создать/подтвердить сам. IPOS.Plan выполняет только роль OAuth Resource Server.

Официальные инструкции:

- https://docs.descope.com/mcp
- https://docs.descope.com/agentic-identity-hub/core-components/mcp-servers
- https://docs.descope.com/agentic-identity-hub/core-components/mcp-servers/discovery-url
- https://docs.descope.com/identity-federation/inbound-apps/authorization-server

Настроить ресурс с **точным** идентификатором `https://ipos-plan.vercel.app/api/mcp`, scopes **`plans:read`** и **`plans:write`**. Разрешить Authorization Code + PKCE S256 и CIMD (или DCR с ограничениями). В тестах сначала запросить только `plans:read`; право записи — отдельное согласие.

Получить **из своей личной консоли** issuer, Discovery URL, RFC 7662 introspection URL и отдельные server-side client credentials для ресурса, а также неизменяемый `sub` единственного владельца. Не выдавать ChatGPT секрет client introspection.

В Vercel Settings → Environment Variables добавить в Production (все секреты — только там):

| Имя | Значение |
| --- | --- |
| `IPOS_MCP_OAUTH_ISSUER` | Точный `issuer` из OAuth discovery и токена |
| `IPOS_MCP_OAUTH_INTROSPECTION_URL` | HTTPS RFC 7662 introspection endpoint |
| `IPOS_MCP_OAUTH_CLIENT_ID` | **Server-side introspection client ID**, не ChatGPT client ID |
| `IPOS_MCP_OAUTH_CLIENT_SECRET` | **Sensitive**, server-side introspection client secret |
| `IPOS_MCP_OAUTH_OWNER_SUB` | Точный subject личного пользователя |
| `IPOS_MCP_AUTH_MODE` | Уже `oauth`, сохранить |
| `IPOS_MCP_RESOURCE_URL` | Уже `https://ipos-plan.vercel.app/api/mcp`, сохранить |

**Важная совместимость:** текущий resource server требует от introspection ответа `active=true`, `iss`, `sub`, `aud`, `exp`, `client_id`, `scope`. Не все провайдеры автоматически возвращают эти поля, в особенности `client_id` у CIMD-клиента. Если поля отсутствуют, endpoint намеренно отвечает 401. Не ослаблять проверки без security review, договориться с провайдером о формате ответа или перейти на верификацию JWT с подписью/JWKS в отдельном PR. Убедиться в корректном `aud` (точный resource URL), а не в общем project ID.

## 3. Проверить discovery без токенов

После выпуска deployment и настройки:

```bash
npm run mcp:preflight -- --url https://ipos-plan.vercel.app/api/mcp \
  --authorization-metadata-url https://YOUR_PERSONAL_OAUTH_ISSUER_METADATA_URL
```

`authorization-metadata-url` — **публичный адрес JSON метаданных**, указанный в консоли провайдера (не token endpoint и не файл с ключами). Скрипт проверяет issuer, PKCE S256, Authorization Code, CIMD/DCR, ожидаемые scopes, protected resource metadata и запрет анонимного MCP (`401` с `WWW-Authenticate`). Он **не отправляет никакие секреты**, не читает планы и не проверяет выдачу токенов.

## 4. Только после успешного discovery

1. В ChatGPT добавить частный remote MCP/Plugin с URL `https://ipos-plan.vercel.app/api/mcp` и OAuth.
2. Войти **только в личный аккаунт** провайдера; подтвердить scopes. ChatGPT использует свой OAuth callback `https://chatgpt.com/connector_platform_oauth_redirect`. Если используется CIMD, регистрация клиента происходит по metadata document ChatGPT, если DCR — по dynamic registration провайдера. Не использовать вручную выданные service tokens.
3. Проверить, что `ipos_list_plans` возвращает пустой/тестовый список, а без авторизации — 401. Добавить тестовый план; повторить запрос с тем же idempotencyKey; изменять задачи только после подтверждения записи.
4. В IPOS.Plan открыть импорт «Из GPT», убедиться, что тестовый план появляется как **отдельная локальная копия**. Проверить повторную отправку, обновление, конфликт версий, историю перед заменой, отзыв доступа в провайдере.
5. Не переносить реальные личные/студенческие планы до окончания тестов. Не писать токены и документы в CI-логи.

## Почему сейчас нельзя назвать интеграцию завершённой

Ни приватный Blob не связан с Vercel-проектом, ни личный OAuth tenant не создан/подключён. У GitHub/Vercel API коннекторов в ChatGPT нет операции связывания существующего Blob-хранилища с проектом; Browser Use сейчас отвечает `insufficient_credits`. Настройка внешнего поставщика требует создания/авторизации личного аккаунта и секретов владельца. До этого нельзя честно провести тест ChatGPT login → MCP → private Blob.

Этот документ не содержит секретов и предназначен для повторяемой настройки.
