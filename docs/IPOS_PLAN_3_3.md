# IPOS.Plan 3.3 — Activist directory and assignment analytics

## Baseline and audit

PR #15 merged; start from fetched `origin/main` at `51dead2b63c807b07f55fb0491755dd937b63b29`. Work on `feat/ipos-3-3-activist-management`, PR against main. No automatic merge or production release in this milestone.

3.0–3.2 architecture, task/plan schemas, saved-name directory, Assignments panel, task navigation/search, IndexedDB/repository/autosave, backup, templates, revisions/activity and portable/share/export boundaries reviewed. 3.2 stores collected label strings as `activist:*` settings and splits free-text assignments. It has no stable people identities. Preserve those original records, but stop using automatic name splitting/matching to establish people or task identities. Legacy/group strings must remain usable without interpretation.

## Architecture decision and milestones

Keep IndexedDB layout/version 1. People are strictly validated `person:<UUID>` settings records with an independent edit version, aliases, role, specialization, membership, notes and timestamps. Migrate each old saved-name row once by its source key to a distinct candidate; do not delete rows, infer membership, link tasks or merge names. Candidate -> active requires a deliberate edit.

Store stable task/person associations as optional **local Plan metadata**, keyed by task ID, with selected person IDs, assignment-time display names and any explicitly preserved legacy text. Plan ID is the containing entity. This uses the existing optimistic save queue and transactional Plan/revision boundary instead of a second asynchronous assignment writer. Portable schema v1 remains text-only. Derive counts from unique live referenced tasks and valid local links; never infer identities by matching assignee text. Retain working-copy identity metadata for native undo, prune deleted tasks at persistence, and clear inconsistent links after explicit legacy-text editing or portable import. Preserve identity snapshots in revisions and whole-plan duplication; native task duplication needs explicit ID mapping.

Backups will use a versioned v2 envelope with people and local associations while accepting v1 backups. Restore copies people with fresh IDs without overwriting/matching names, remaps references in current plans/revision snapshots/activity, and retains one atomic restore transaction. No portable format, table or index migration is needed. Full validation and referential-integrity tests remain required.

A: people model, source-key migration and repository tests. B: compact Russian directory/profile/edit routes. C: multi-person picker, exact-brief deep links and explicit legacy reconciliation. D: derived workload filters and reliable persisted person activity. E: backup compatibility, exports, responsive/browser regression and delivery evidence. Commit each working milestone. No backend/auth/cloud, personal contact fields, fabricated work hours or completion timestamps.
