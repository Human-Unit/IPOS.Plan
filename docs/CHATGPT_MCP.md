# ChatGPT ↔ IPOS.Plan: AI workspace (initial MVP)

Status: **source implementation on a feature branch, not a deployed or connected ChatGPT plugin**.
This scope is a single-owner proof-of-concept. Follow-up work: official MCP SDK,
OAuth/OIDC, account isolation, comprehensive integration tests, and a connector
installation/release checklist.

## Why there is a separate workspace

IPOS.Plan remains a **local-first** product. Normal drafts, activity, tasks and
history are in the browser's Dexie IndexedDB database. A server cannot access
this data. A public `/p/[id]` publication is a read-only snapshot and must not
be used as a mutable draft.

The new AI workspace is a *different*, private storage namespace in Vercel Blob:

- `ai-workspace/v1/<uuid>.json` — private, versioned portable schema-v1 document;
- no existing local plan is uploaded without the user clicking to connect it;
- the editor records a local `ai-sync:plan:<localPlanId>` mapping in Dexie settings;
- browser sync uses the existing admin session, server route permissions and
  same-origin check; MCP uses a dedicated bearer token (single owner);
- server writes use ETag compare-and-swap and expectedVersion, conflict = HTTP 409;
- a cloud update is **never applied to IndexedDB automatically**; preview and
  explicit confirmation are required. `replacePlan` saves a local revision.

## Runtime environment

Required to enable private plan API (server-side environment only):

```ini
BLOB_READ_WRITE_TOKEN=<private Vercel Blob RW token>
```

Required to enable the preliminary MCP endpoint, additionally:

```ini
IPOS_MCP_API_TOKEN=<random private token at least 40 characters>
```

Optional for browser cross-origin MCP callers; use only vetted origins:

```ini
IPOS_MCP_ALLOWED_ORIGINS=https://your-authorized-client.example
```

Do not expose these values in `NEXT_PUBLIC_*`, Git history, screenshots, query
parameters, JSON imports or an MCP tool result. The existing admin password,
session cookie and publication-management keys are *not* MCP bearer tokens.
Rotate `IPOS_MCP_API_TOKEN` if it is accidentally disclosed.

## User workflow (one plan at a time)

1. Log in through `/admin/login` (on the **same domain**).
2. Open an existing local plan and select **GPT** in the editor.
3. Click **Подключить этот план**. This uploads only the currently selected
   saved portable plan to the private AI workspace, creating server version 1.
4. Use an authorized MCP client for the tools below.
5. Back in the editor, open **GPT → Проверить изменения из GPT**.
6. Review the entire remote document; explicitly confirm before applying.
   The former local version is saved via the existing import/revision path.
7. If local edits should take precedence, click **Отправить локальные
   изменения**; a stale server version returns 409 instead of overwriting.

Important: creating a new cloud-only plan via MCP does **not** automatically
create a new IndexedDB browser plan. Use **Из GPT** on the dashboard, review
that server plan, and click **Создать локальную копию**. This opt-in import
creates a new local plan and stores its cloud ID mapping; no existing draft
is overwritten.

## HTTP API (admin cookie only)

- `GET /api/ai/plans?cursor=...` — page of up to 50 private plans;
- `POST /api/ai/plans` — `{ "document": <PortablePlan> }`;
- `GET /api/ai/plans/<uuid>` — private record `{id,version,document,...}`;
- `PUT /api/ai/plans/<uuid>` — `{ "expectedVersion": 1, "document": <PortablePlan> }`.

No public CORS, no anonymous access. POST/PUT require same-origin checks and
the signed admin cookie. Both use `parseImport` with full document schema
validation and preserve the existing 1 MiB portable format.

## MCP endpoint (single-owner technical preview)

`POST /api/mcp` uses stateless Streamable HTTP JSON-RPC and a dedicated
`Authorization: Bearer ...` token. Implemented tool names:

- `ipos_list_plans`, `ipos_get_plan` (read only);
- `ipos_create_plan` (new empty server plan);
- `ipos_add_task` (idempotency key, optional Instagram reference; deadline is
  omitted unless provided);
- `ipos_update_task` (selectively edit task fields);
- `ipos_replace_plan` (whole document, marked destructive).

Tool responses include a current server version. Write calls require
`expectedVersion`; clients should read the latest record first.

This minimal handler supports 2025-era stateless MCP initialize/tools/list/
tools/call. **It is not an official-SDK server, does not provide OAuth, and is
not yet certified against ChatGPT's current MCP connector protocol. Do not
treat creating an endpoint as proof it works in ChatGPT.** Replace the minimal
adapter with the maintained `mcp-handler` 2 / MCP SDK v2 transport and
OAuth 2.1 before production rollout or multi-user access.

Example of authorized protocol smoke test (replace credentials in your shell
environment, not in history):

```bash
curl --fail-with-body -sS -X POST "https://YOUR_DEPLOYMENT/api/mcp" \
  -H "Authorization: Bearer ${IPOS_MCP_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}'
```

Expected high-level response: `result.serverInfo.name="ipos-plan"` and
`result.capabilities.tools`. Continue with `notifications/initialized`,
`tools/list`, and `tools/call` only after verifying authorization.

## Safety and verification before merge/deploy

- [ ] `npm ci && npm run lint && npm run typecheck && npm test && npm run build`
- [ ] Validate JSON schema, malformed taskId/deadline, 1 MiB size limit
- [ ] Test anonymous `401`, foreign Origin `403`, conflicts `409`, invalid
      input and missing records
- [ ] Check exact-once idempotency for retry of `ipos_add_task`
- [ ] Verify ETag stale write rejection against actual Vercel Blob
- [ ] Manual editor: activate, make local/remote changes, preview, accept,
      check prior local revision and A4/JSON/DOCX exports
- [ ] Test same-origin admin cookie after login and rate-limit requests
- [ ] Test the MCP protocol using an MCP Inspector/current ChatGPT connector
- [ ] Confirm no automatic upload of other IndexedDB plans
- [ ] Use a non-production Blob store for acceptance, never real user drafts

See `PRODUCT.md`, `docs/PLAN_SCHEMA.md`, and GitHub issue #33 for later
OAuth/roles/shared-workspace design. Do not deploy this preview without
integration testing and an explicit security review.
