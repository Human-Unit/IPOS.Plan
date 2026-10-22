# IPOS.Plan 3.1 — Productivity and data safety

## Baseline and audit

Branch `feat/ipos-plan-3-1-productivity` starts at `9ca5905`, the fetched head of open PR #13 (`fix/ipos-3-0-1-ux-reliability`). Stack against that branch; do not merge or promote to production. README, architecture, 3.0 and 3.0.1 reports, repository, schemas, brief adapter, import/export, share, inline images and tests inform this implementation.

The dashboard reads IndexedDB plans through Dexie live queries. DB version 1 has plans, revisions, activity and settings. Portable schema v1 and local optimistic concurrency version are independent. Existing JSON export contains one portable document, not history. Plan writes already use optimistic concurrency transactions; backups need a separate transaction spanning all four tables. Current revisions embed full local Plan snapshots. Activity includes historical custom types and JSON metadata. Settings currently contain the demo seed marker; panel widths are browser UI preferences and excluded from portable backups.

The editor projects canonical task blocks plus companions into native briefs and serializes back without internal containers. Template extraction/insertion must reuse that adapter and generate fresh task/block IDs. Search should derive from documents and provide task navigation without removing native editor blocks. Date intelligence must compare calendar days, excluding completed/cancelled work. Existing import/share/media validators and exports remain authoritative; backup validation must never render or fetch media.

## Implementation plan and safety contract

A: versioned, bounded JSON library backups; complete validation before a single atomic restore. Safe copies by default or skip conflicting plans. No replacement. Preserve task/block identity inside each copied plan; remap plan IDs, revision snapshot IDs and all history references. Preserve times and concurrency versions. Allowlisted settings include demo marker and validated local template records; existing settings are never overwritten. Unknown settings remain local. Export reads a consistent transaction. Limits: 50 MiB/file, 1000 plans, 10000 revisions, 50000 activity records, 500 custom templates, guarded nesting/node count and existing per-plan constraints. Corruption, duplicate IDs, unsafe keys, dangling history and incompatible versions fail before writing. Quota/constraint failures roll back all tables.

B: six built-in brief templates and custom whole-task templates in existing settings, with no migration or portable-format changes. Preview before insertion; strip personal scheduling/completion metadata by default. C: derived Russian search and filters, compact dashboard counts, local date-only deadlines and non-destructive task results/navigation. D: regression, accessibility and responsive checks on optimized local build, feature PR and Preview only.

Browser plugin runtime is unavailable, so frontend testing uses regular Playwright with isolated browser storage. Screenshots and temporary scripts live outside source in `C:/Users/ahmad/.codex/artifacts/ipos-3-1/` and `C:/Users/ahmad/.codex/tmp/ipos-3-1/`.

## Implemented behavior and usage

### Library backup and recovery

On the dashboard choose **Резервная копия → Скачать все данные**. The download includes every persisted Plan (including local ID, timestamps and optimistic version), revision snapshots, activity with historical types/JSON metadata, inline media bytes, typography/font sources, the demo marker and custom brief templates. All four tables are read in one IndexedDB transaction. Wait for **Сохранено локально** in other open editor tabs first: another tab's unsaved in-memory draft cannot be captured by a database backup. External image/font URLs remain URLs; originals outside browser data are not included. Panel widths and other disposable localStorage UI state are excluded.

Choose **Восстановить данные**, select a library `.json`, review its timestamp/counts and select **Добавить новыми копиями** (default) or **Пропустить планы с совпадающими ID**. Only **Подтвердить восстановление** writes. Cancellation preserves the library. The radio options and warnings remain keyboard accessible; the bounded content region scrolls on small screens while confirmation buttons stay visible. The result lists added plans, revisions, events, settings and skipped plans.

Copies use fresh plan IDs and fresh revision/activity IDs; `planId` and revision `snapshot.id` point to the copied plan. Tasks, block IDs, historical task/block metadata references, content, times and optimistic versions remain intact within that plan. Skip mode checks current plan IDs inside the write transaction, excludes the skipped plan's history, and adds only absent plans. History record IDs are regenerated in both strategies to avoid collisions with unrelated existing history. Custom template keys are regenerated in copy mode; conflicting settings are skipped in skip mode. No existing setting is replaced. There is no replacement strategy.

The restore boundary revalidates input, then writes all four tables in one Dexie transaction using add/bulkAdd, never upsert. Failure at any write aborts the transaction. Quota errors explain insufficient space and confirm cancellation; invalid input never starts a write. JSON is inert data. Parsing guards depth, node count, forbidden prototype keys, duplicate record IDs/settings, schema versions, date fields, related-plan references, snapshot IDs and per-document limits. Inline raster signatures and URL protocols use the existing schema. Validation does not render templates or request external media.

Independent versions remain:

| Value | Meaning | Current value |
| --- | --- | --- |
| IndexedDB version | Table/index layout | 1, unchanged |
| Portable `schemaVersion` | JSON/share/editor document compatibility | 1, unchanged |
| `Plan.version` | Optimistic concurrency counter | Preserved per record |
| Backup `formatVersion` | Full-library transport | 1 |

### Brief templates

In the workspace choose **Шаблоны**, select Reels, Instagram carousel, Instagram Stories, Poster / Graphic Design, Interview or Photography, inspect the read-only brief, then **Вставить задачу**. Each has content-specific native headings/text prompts/reference blocks; structured fields remain the existing title, description, assignee, deadline, priority and status. The entire inserted result is editable. Existing **Задача / Новая задача** and slash insertion still create blank tasks.

Use a task's action menu → **Сохранить как шаблон**, give it a name and save. Extraction uses the existing projected brief boundaries, including original nested blocks and legacy sibling requirements/media. Typography is retained. A selected whole brief can include nested tasks; all referenced task entities travel together. Local templates appear under **Мои шаблоны** and are part of library backup.

By default both saving and inserting strip assignees/deadlines and reset status to `todo`. Explicit checkboxes opt into saved personal scheduling/status. Text and media remain as authored; review those for personal content before reuse. Each instantiation generates new block/task IDs with consistent references and remaps typography. Built-in objects are never mutated. Templates are allowlisted validated settings records, not a new portable schema/table. Existing plan font sources win if a template uses the same family name; other template font sources are added subject to existing limits.

### Search and deadlines

The dashboard searches plan titles, task titles/descriptions and responsible people. Russian matching is case insensitive, normalizes Unicode and treats е/ё equivalently. The filter offers all plans, unfinished work, overdue work and plans edited in the last seven local calendar days. Results display shown/total counts, a useful empty state and **Сбросить поиск**.

**Поиск задач** opens/focuses the outline's search. Query text matches title, description, responsible person, Russian status/priority and ISO or displayed deadline. Native select controls combine status, priority, person and deadline filters. Shortcuts show overdue, due this calendar week (today through Sunday) or awaiting review. The result count is for unique live referenced tasks; retained undo-only task entities are excluded. Choosing a result opens/unfolds the brief. The full document and original structural outline remain available; search never removes, reorders or serializes a filtered subset into BlockNote. Exports, undo, preview and sharing retain the full plan.

Dashboard totals cover the entire library, independent of search: unfinished, overdue, due from today through seven days ahead, and completed. `done` and `cancelled` never count as unfinished/overdue; only `done` counts as completed. Missing dates remain distinct. Relative task indicators use the local calendar date, including month/year/leap-day boundaries. One shared subscription updates at local midnight and window focus/visibility changes. UTC is used only to subtract calendar-day ordinals, not to parse a local deadline as a timestamp. Read-only snapshots/printing retain fixed dates rather than time-varying relative hints. No push notifications, scheduled background reminders or closed-browser behavior is claimed.

## Files and compatibility

- `features/backup/backup.ts`, `backup-menu.tsx`: strict transport, read/write transactions, dashboard confirmation/result UI and quota feedback.
- `features/templates/templates.ts`, `template-dialog.tsx`: built-ins, whole-brief extraction, ID remapping, local persistence and preview/save dialogs.
- `features/plans/productivity.ts`, `use-local-date.ts`, `task-search.tsx`, `dashboard.tsx`: derived search/date logic, shared date subscription, task navigation and compact library UI.
- `components/editor/{plan-renderer,plan-context,plan-outline}.tsx`, `task/task-card.tsx`: editor integration, template commands and semantic fixed dates/relative hints. Existing autosave/repository, native adapter, portable/share codec, image preparation and exports stay authoritative.
- `app/{surfaces,workspace}.css`: scoped controls and responsive dialog/search layout using existing tokens. Seal bytes, colors, fonts, A4 and modes are preserved.
- New backup/template/productivity unit suites and production-workflow browser scenarios; existing editor-layout assertion now checks the exact semantic date separately from its new relative text. No existing data/geometry assertions were removed.
- `.github/workflows/validate.yml` adds the stack's 3.0.1 base to PR validation triggers; README and architecture link this report. No runtime dependency, migration, backend or environment changes.

## Limits and release boundary

Library backup is bounded JSON in memory, not streaming/archive storage: 50 MiB/file, 1000 plans, 10000 revisions, 50000 activity records, 500 custom templates, maximum guarded JSON nesting 45 and 2 million nodes. Existing 1 MB document, 1000-block, 500-task and inline-raster limits apply independently to each plan, snapshot and template. Unsupported/malformed records fail the complete backup rather than silently dropping history. Prototype-related JSON keys are rejected. Backup files are ordinary readable local JSON; they are not encrypted or uploaded.

Safe add/skip restoration preserves originals and may duplicate storage usage. There is no overwrite, automatic replacement snapshot, cloud sync or cross-tab unsaved-draft capture. External media/fonts still depend on their hosts. Custom templates intentionally have no separate management screen in this milestone. Existing contextual reference selection follow-up from 3.0.1 remains. Chromium viewport emulation does not establish physical-device, Safari/Firefox, screen-reader audio or Word/LibreOffice visual parity.

Feature branch and stacked PR/Preview only. PR #13 remains the dependency while open; recheck before handoff and retarget/revalidate if it merges. No merge or production promotion is authorized here.

## Verification and evidence

| Check | Result |
| --- | --- |
| `npm ci` | PASS; unchanged five high development-tool advisories, no forced upgrade |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 89 tests / 11 files (40 new tests) |
| `npm run build` | PASS, optimized production build |
| `npm start` + `npm run test:e2e` | PASS, 19 scenarios (16 previous + 3 productivity workflows) |
| Separate production-build browser audit | PASS, 44 assertions; zero console errors/warnings |
| Responsive sizes | 1440×900, 1024×768, 768×1024, 390×844, 320×700; no horizontal overflow |

Backup units cover empty and multiple-plan round trips, inline rasters, fonts and optimistic versions, old activity metadata, revisions, remapped copies, skip conflicts, duplicated record/settings IDs, malformed/incompatible/deep/unsafe data, external-media validation without fetch, and complete rollback on both quota and constraint failures injected at the final settings write. Template units cover all six presets, whole legacy/nested brief extraction, local save/load/backup, default metadata stripping, explicit opt-in, fresh IDs and typography associations. Search/date units cover Russian case/е/ё, title/description/person/metadata/date matches, combined filters, empty/reset behavior, no mutation, local date semantics, today/tomorrow/overdue, missing/completed/cancelled dates, seven-day versus calendar-week windows, leap day and month/year boundaries.

New browser workflows download a real backup, inspect confirmation and default copies, restore/skip conflicts and reject invalid data; preview and insert a built-in, save/reload/reinsert a custom whole-task template and keep blank insertion; exercise search/filter/reset/navigation at all five widths and compare complete exported tasks/blocks with the original fixture. Existing scenarios retain stale-tab protection, history flush/restore, autosave/reload, snapshots in another tab and `/view` refresh, font persistence, native editing/reordering/undo, Russian calendar, notification priority, JSON, editable DOCX, A4 printing and image paste/drop/replacement/transport.

The visual audit imports a realistic five-brief autumn media plan with several responsible people, long descriptions, references and images, then inserts a real portrait file as reduced inline WebP. It checks dashboard search, backup containing that inline photo, accessible restore strategy/warnings and confirmation placement, deadline labels, review-result navigation, and all six template previews at every size. Screenshot inspection corrected the 320 px restore dialog: its content now scrolls independently while footer controls stay fully inside the panel. Template preview padding is scoped to beat embedded-document defaults. The original exact date assertion now targets `<time>` while preserving its exact date and all geometry/data checks.

Evidence directory: `C:/Users/ahmad/.codex/artifacts/ipos-3-1/`. `results.json` contains named assertions and console diagnostics. Twenty-five PNGs: `dashboard-*`, `restore-*`, `editor-*`, `search-*`, `template-*` for each requested width. Temporary script: `C:/Users/ahmad/.codex/tmp/ipos-3-1/review.mjs`. These artifacts remain outside tracked source. Browser sequence: isolated context + fixed calendar date → import realistic plan → native file insertion → saved-state wait → library download → per-size search/restore review/editor/deadline/navigation/template checks → screenshots and console collection.

Milestone commits before final QA: A `8f7764f` backup/recovery; B `74baa8a` templates; C `d743dd1` search/deadlines. Final QA commit, feature head, PR/Preview URLs and hosted CI outcome are supplied in the delivery/PR. The 3.0.1 source branch is untouched.
