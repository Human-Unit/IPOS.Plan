# IPOS.Plan development roadmap

Phase 2 work starts from main at `7e58c14cc0933152448b3ca80b8687036d420801`. The reference production project is `diamond-dogs2/ipos-plan`; the public homepage returned HTTP 200 during baseline inspection. That response alone does not establish the deployed commit. [Baseline merge](https://github.com/Human-Unit/IPOS.Plan/pull/37) · [Production](https://ipos-plan.vercel.app)

## Release boundaries

Preserve Cobalt & Ink, IndexedDB and the schema-v1 document contract, BlockNote, JSON and DOCX portability, A4 print, published pages and snapshot links, both themes and motion, and all existing authentication boundaries. Use isolated fixtures for server and data tests. Defer OAuth onboarding, private Blob connection, production credentials, production migrations and paid infrastructure. Ship each change as a focused PR for review.

## PR inventory

| PR | Verified state | Disposition |
|---|---|---|
| [#16](https://github.com/Human-Unit/IPOS.Plan/pull/16) | Open, 50 files, people and workload | Recover individual models and workflows selectively in Phase 3. |
| [#17](https://github.com/Human-Unit/IPOS.Plan/pull/17) | Open, 2 files, older hero | Current Cobalt & Ink is authoritative. |
| [#34](https://github.com/Human-Unit/IPOS.Plan/pull/34) | Open draft, private workspace and MCP foundation | Review current main for behavior already represented in #37. Keep the draft and its external readiness gate intact. |
| [#35](https://github.com/Human-Unit/IPOS.Plan/pull/35) | Open draft, Cobalt integration over MCP branch | Preserve the integrated appearance in main. |
| [#36](https://github.com/Human-Unit/IPOS.Plan/pull/36) | Open draft, OAuth readiness | Keep pending provider and private storage validation. |
| [#37](https://github.com/Human-Unit/IPOS.Plan/pull/37) | Merged to main | Baseline for the roadmap. |

## Execution and acceptance

| Milestone | Acceptance | Status |
|---|---|---|
| Baseline | Record exact main SHA and Node version. Run clean install, lint, typecheck, unit/MCP/build/browser and independent DOCX validation. Capture the current UI in both themes at the specified widths. | Recorded |
| Dependencies | Run both npm audits and review advisory ranges. Apply supported selective updates on Node 24 with the same full gate. Record any deferred peer conflicts. | Verified locally |
| Security | Inventory admin, publication, workspace and MCP boundaries. Demonstrate existing authorization, safe response headers/errors and input limits with focused tests. Document a persistent limiter and revocation decision with any external prerequisites. | App code verified locally. Durable WAF and per-session revocation deferred. |
| Data reliability | Prove atomic failures do not partially save data. Cover stale tabs, interrupted autosave, backup restore, malformed/duplicate/large inputs and mocked Blob version conflicts. | Verified locally |
| Performance | Measure static and runtime JS, dashboard/search/IndexedDB/BlockNote/image timing, memory and mobile on repeatable fixtures. Measure private listing cost using isolated mocks and justify any metadata index. Keep production storage unchanged. | Pending |
| Activists | Port useful #16 capabilities individually. Validate local profiles, assignment history/navigation and old backups. Preserve portable assignee text. | Phase 3 |
| Calendar | Weekly/monthly views distinguish task deadlines from publication dates. Verify filters, direct navigation and mobile. | Phase 3 |
| Kanban | Specify a backward-compatible stage mapping. Verify keyboard and pointer changes operate on the same task records. | Phase 3 |
| Editorial approval | Validate draft, review, changes, feedback, approval and readiness. Identify local workflow metadata truthfully. | Phase 3 |
| Analytics and integration | Derive counts and weekly activity from saved records. Verify both themes and the full integrated workflow. | Phase 3 |

For rendered acceptance use 320, 390, 768, 1024 and 1440 px in both themes. Record commands, fixture conditions, limitations, commit and PR for each milestone. Retain the independent DOCX ZIP/OOXML check.

## Baseline evidence

- Node 24.13.0 and npm 11.6.2. Clean install, lint, typecheck, 126 unit tests and four MCP preflight tests passed. The first Next.js 16.4.1 build stopped on its security notice. A normal retry completed.
- Chromium ran 47 passing cases and skipped the two credential-gated cases with the standard configuration. A separate run with local fixture credentials found the two skipped paths failing on loopback. The same-origin rejection happens before password validation. Cross-origin rejection and unauthenticated redirect passed. The ordinary browser suite remains the comparison gate for the dependency-only PR. The security milestone must exercise all four admin cases with fixtures.
- Exported the seeded plan through the editor and independently verified DOCX ZIP CRC and the five critical OOXML files used by CI.
- Captured anonymized seeded dashboard and editor at 320, 390, 768, 1024 and 1440 px in light and dark themes. No horizontal overflow or browser page errors on those captures. The baseline desktop has both a filter select and a tab strip visible. Dashboard refinement is outside this dependency milestone.
- Initial Chromium diagnostics report 1,084,443 decoded JavaScript bytes on the dashboard and 2,312,126 in the editor. Wall-clock timings varied during startup, so these samples do not establish an optimization win.

## Dependency findings

- Full npm audit reported eight moderate entries. The production-only audit reported one affected dependency, Next.js, with seven advisory records. Audit counts include transitive packages. [Next.js security release](https://nextjs.org/blog/november-2026-security-release)
- Checked current application source for affected Cache Components and Edge patterns. IPOS uses the image component, but no reviewed source opted into the affected cache patterns or Edge routes. Patch regardless of feature exposure because Next.js handles the incoming requests. [Next.js advisories](https://github.com/vercel/next.js/security/advisories)
- The development advisory is in the TypeScript ESLint dependency chain through minimatch. TypeScript ESLint 8.74.0 resolves a patched minimatch 11.x. [Minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
- ESLint 9 is end-of-life. The current React, import and JSX accessibility plugins still declare support only through ESLint 9, so migration to ESLint 10 is deferred until supported peers are available. Retain the existing rules and lint gate. [ESLint lifecycle](https://eslint.org/version-support)
- Local tooling and CI use Node 24. The package engine constrains future Vercel preview builds to that major. [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)


### Dependency candidate evidence

- Next.js and eslint-config-next `16.4.1 → 16.4.6`. TypeScript ESLint `8.71.2 → 8.74.0` and its minimatch `10.2.6 → 11.0.9`. Both requested npm audits return zero reported vulnerabilities. Lockfile changes are limited to those dependency families and engine metadata.
- A clean install, lint, typecheck, 126 unit cases, four MCP preflight cases and the production build passed on Node `24.13.0`. The patched build completed on the first run.
- Repeated the dashboard and editor captures at all five widths in both themes. Decoded JS was 1,086,632 bytes on the dashboard (+2,189) and 2,314,532 in the editor (+2,406). This is a dependency comparison, not the controlled performance milestone.
- Evidence from the patched build: [1440 px light dashboard](docs/reports/phase2-baseline/dashboard-desktop.png) and [320 px dark editor](docs/reports/phase2-baseline/editor-mobile.png). Screenshots use the bundled demo only.
- If the framework patch regresses preview behavior, revert this change together with its lockfile and reassess the advisory exposure before any release.
- Patched build browser suite: 47 passed and two credential-gated cases skipped. Independent DOCX ZIP/OOXML validation also passed.

## Security milestone

Stacked on the [dependency baseline PR](https://github.com/Human-Unit/IPOS.Plan/pull/38). The current routes serve four distinct trust boundaries.

| Boundary | Review and decision |
|---|---|
| Admin session | Keep HMAC, secure HttpOnly cookie, seven-day expiry and exact Origin enforcement. Next can normalize a loopback URL to localhost, so match the actual loopback authority without trusting forwarded headers. Stream login JSON under 1,000 bytes. Record fixed security event names only. |
| Publication API | Keep publication key, independent management key, document contract and existing ETag conflict behavior. Stream document writes under 1,500,000 bytes after authorization. Return actionable validation errors and generic infrastructure errors. Management and JSON responses remain uncached. |
| Private workspace | Preserve the owner session and origin requirements for browser writes, bounded validation, CAS and explicit configuration. Reuse bounded JSON transport. No live private storage is involved in tests. |
| MCP and OAuth metadata | Keep stateless SDK transport's body limit, origin policy, token/scope checks and fail-closed mode. Existing mocks exercise the read/write separation. Real OAuth and private Blob remain behind their existing readiness gate. |

Login/management rate limits should run at the Vercel WAF before hitting any function. Confirm rule limits and cost with the owner, start with a low-volume observation period, and validate 429 handling on isolated preview traffic. A function-local map would reset across instances and cannot enforce this limit. No WAF change was made. [Provider rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)

Logout clears the current browser cookie. The existing signing-key rotation invalidates all sessions if needed during incident response. Per-session revocation would require shared state with expiry. That dependency and any credential operation remain separate from this milestone. Structured events use fixed labels and intentionally omit request metadata, credentials and documents.

- Clean install, lint, typecheck, 133 unit tests, four MCP preflight tests, build, independent DOCX validation and 50 browser tests passed locally. The browser run configured only synthetic credentials. Independent Chromium confirmed Secure, HttpOnly and SameSite=Strict cookie flags and logout. [Mobile login](docs/reports/phase2-security/admin-mobile.png) · [Owner workspace](docs/reports/phase2-security/owner-workspace.png)

## Data reliability milestone

Stacked on the [server-hardening PR](https://github.com/Human-Unit/IPOS.Plan/pull/39). A local browser fixture exposed stale share snapshots when a draft edit arrived during an IndexedDB save. The flush barrier now commits pending edits in order before returning the final draft. Each write still compares the local version and atomically records the matching history. No schema or stored record changes are required.

Added real-browser regressions for sharing while an IndexedDB write is in flight and retrying a draft after an interrupted write. Existing coverage verifies transactional rollback, invalid and oversized JSON, duplicate IDs, same-browser stale-tab conflicts, backup restoration, publication updates, and isolated private Blob compare-and-swap. Forced browser termination can still interrupt asynchronous persistence, and cloud/provider behavior remains mock-verified only.

- Clean install, lint, typecheck, 133 unit, four MCP preflight, 52 browser tests, production build and independent DOCX verification passed. Captured source dashboard/editor and updated snapshot at all five widths in both themes. [Desktop snapshot](docs/reports/phase2-data/snapshot-desktop.png) · [Dark mobile snapshot](docs/reports/phase2-data/snapshot-mobile.png)
