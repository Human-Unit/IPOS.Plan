# IPOS.Plan 3.1 — Productivity and data safety

## Baseline and audit

Branch `feat/ipos-plan-3-1-productivity` starts at `9ca5905`, the fetched head of open PR #13 (`fix/ipos-3-0-1-ux-reliability`). Stack against that branch; do not merge or promote to production. README, architecture, 3.0 and 3.0.1 reports, repository, schemas, brief adapter, import/export, share, inline images and tests inform this implementation.

The dashboard reads IndexedDB plans through Dexie live queries. DB version 1 has plans, revisions, activity and settings. Portable schema v1 and local optimistic concurrency version are independent. Existing JSON export contains one portable document, not history. Plan writes already use optimistic concurrency transactions; backups need a separate transaction spanning all four tables. Current revisions embed full local Plan snapshots. Activity includes historical custom types and JSON metadata. Settings currently contain the demo seed marker; panel widths are browser UI preferences and excluded from portable backups.

The editor projects canonical task blocks plus companions into native briefs and serializes back without internal containers. Template extraction/insertion must reuse that adapter and generate fresh task/block IDs. Search should derive from documents and provide task navigation without removing native editor blocks. Date intelligence must compare calendar days, excluding completed/cancelled work. Existing import/share/media validators and exports remain authoritative; backup validation must never render or fetch media.

## Implementation plan and safety contract

A: versioned, bounded JSON library backups; complete validation before a single atomic restore. Safe copies by default or skip conflicting plans. No replacement. Preserve task/block identity inside each copied plan; remap plan IDs, revision snapshot IDs and all history references. Preserve times and concurrency versions. Allowlisted settings include demo marker and validated local template records; existing settings are never overwritten. Unknown settings remain local. Export reads a consistent transaction. Limits: 50 MiB/file, 1000 plans, 10000 revisions, 50000 activity records, 500 custom templates, guarded nesting/node count and existing per-plan constraints. Corruption, duplicate IDs, unsafe keys, dangling history and incompatible versions fail before writing. Quota/constraint failures roll back all tables.

B: six built-in brief templates and custom whole-task templates in existing settings, with no migration or portable-format changes. Preview before insertion; strip personal scheduling/completion metadata by default. C: derived Russian search and filters, compact dashboard counts, local date-only deadlines and non-destructive task results/navigation. D: regression, accessibility and responsive checks on optimized local build, feature PR and Preview only.

Browser plugin runtime is unavailable, so frontend testing uses regular Playwright with isolated browser storage. Screenshots and temporary scripts live outside source in `C:/Users/ahmad/.codex/artifacts/ipos-3-1/` and `C:/Users/ahmad/.codex/tmp/ipos-3-1/`.
