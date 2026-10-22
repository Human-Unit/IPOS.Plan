# IPOS.Plan 3.0.1 — UX and reliability fixes

## Initial audit

Base: fetched `origin/main` at `73a6bd9` (22 October 2026). Clean checkout; branch `fix/ipos-3-0-1-ux-reliability`. README, architecture, repository, autosave hook, editor screen, history, inspector, task card, toaster/layout and existing persistence/browser tests reviewed. No production changes are authorized for this release.

1. **Activity:** `savePlan` compares task creation/status/assignee and reference creation only. Other edits are successfully persisted but produce no event. The immutable creation messages correctly retain their original names, but there is no later rename event to explain the change. `onHistory` opens immediately, before pending debounced writes. Existing writes already use a version-checked Dexie transaction. Keep that boundary and append events from differences between persisted canonical snapshots; do not rewrite or backfill old events.
2. **Focus:** state and toggle exist, but there is no Escape handler. Keep the same renderer/selection and let overlay handlers consume Escape before exiting focus.
3. **Deadline:** the inspector uses a properly labelled native `input[type=date]`. Its internal picker announcement comes from the browser/OS, not an application calendar. Page `lang=ru` cannot reliably localize that internal control in an English browser. Use a library calendar with Russian locale and an explicitly labelled Radix trigger; preserve date-only ISO storage.
4. **Notifications:** root layout enables default Sonner stacking/4000 ms timing and close buttons for all notifications. No shared severity timing or duplicate-success policy exists. Mobile needs one visible item, compact safe-area-aware placement and short routine confirmations. Errors/warnings must retain longer reading time and Sonner's live region.

Scope: four fixes and directly related tests/copy. IndexedDB version/tables, portable schema, brand assets, storage queue and renderer architecture remain unchanged. Existing `700 ms` debounce provides save-boundary aggregation; identical repeated saves must emit no new events. Activity describes actions at the time they happened, while revisions are full restorable snapshots.

Baseline browser reproduction confirmed all four issues: history retained only `Создана задача: Новая задача` and `Референс: без названия` after edits; focus remained active after Escape; Chromium accessibility tree exposed `Show date picker Show date picker`; save/DOCX/JSON actions left three visible mobile toasts. No baseline runtime errors. Screenshots: `before/history-1440.png`, `before/deadline-1440.png`, `before/toasts-390.png` in the artifact directory.

## Verification approach

Use isolated Chromium storage, never the user's browser profile. Browser plugin not available under the frontend-testing skill's runtime/skill requirement, so use regular Playwright. Baseline and final screenshots are kept outside source under `C:/Users/ahmad/.codex/artifacts/ipos-3-0-1/`. Requested sizes: 1440×900, 1024×768, 768×1024, 390×844, 320×700.

Final implementation, validation results and release links will be recorded after testing.
