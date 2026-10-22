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

## Implementation and decisions

**Activity history.** `activity-changes.ts` compares the previous persisted portable document with the next portable document inside `savePlan`'s existing version-checked Dexie transaction. Plan and events commit or roll back together. Task creation/rename/deletion, description, status, assignee, deadline and priority changes are recorded. References are traversed recursively; add/change/remove events preserve the original block ID. One `REFERENCE_CHANGED` per reference/save carries `changedFields` for title/URL/note edits. Existing creation/status/assignee/reference-add types remain. Task rename messages show old → new names; description/note payloads are excluded from activity. No new database index/table/version or portable schema is required.

The existing 700 ms autosave debounce aggregates typing into save boundaries. Each changed task field produces at most one event in that boundary; repeated identical saves produce no events. No historical messages are modified, reinterpreted using current names, or fabricated. Old event types and metadata remain valid. This intentionally records persisted changes rather than every transient keystroke. Opening History now waits for `flush()` and its write queue; a failed flush keeps the dialog closed and exposes the error. History explains which entries are restorable snapshots and which are immutable action records. The existing 50-event UI limit remains.

**Focus Escape.** One window bubble listener exists only while focus mode is active in the editor. It checks composition, active controlled dialogs, visible Radix/BlockNote overlays and consumed events. Cleanup runs on state changes/unmount. Installed BlockNote 0.55 always consumes plain-text Escape to blur (`OverrideEscape`); that specific blur is recognized and its native selection restored before exiting focus. Other consumed events remain owned by their UI. The editor instance, content, panel visibility/widths and typography do not change. A dialog, action menu, image lightbox or slash menu closes on the first Escape; focus exits on the next unclaimed Escape.

**Deadline.** The existing `Дедлайн` field now composes shadcn Calendar, React DayPicker 10 and Radix Popover. The trigger has one Russian accessible name, `Выбрать дедлайн`, an associated field label, and its date as a separate accessible description. The extended `react-day-picker/locale/ru` translates navigation/day labels as well as month text, even in an English browser. Built-in calendar arrow-key/Enter behavior and Radix focus restoration remain. Removing a deadline is explicit. `date-fns` date-only parsing/formatting preserves local dates and existing `yyyy-MM-dd` storage; no UTC timestamp conversion or migration. Two direct dependencies were added (`react-day-picker`, `date-fns`); existing Button and brand components were not overwritten. The registry's extraneous `cn` dependency was removed in favor of the existing utility.

**Notifications.** Existing success/error call sites use the small `notifications.ts` policy around Sonner. Routine confirmations last 2 seconds, replace previous successes, and suppress identical messages for 2 seconds. Active warnings/errors take priority over new successes. Warnings last 8 seconds, errors 10 seconds, and both retain a labelled close control. The explanatory image-copy message retains 6 seconds. No promise/error handling or operation result was changed.

The toaster displays one item below 768 px and at most two on desktop, uses safe-area-aware offsets and a compact 13 px/1.45 layout. Routine messages measure 41.5 px high in Chromium. Hidden stack entries stay visually hidden; Sonner's polite live region, hotkey, swipe and reduced-motion behavior remain. Visible mobile notifications reserve a temporary bottom strip in modal layouts so export buttons and inspector controls remain above the notification. Close buttons sit inside the toast, measure 30×30 px, and have a Russian name. Toaster pointer events work over Radix overlays; interacting with a toast no longer dismisses the parent dialog. Modal keyboard focus trapping remains intact.

## Files changed

| Area | Files |
| --- | --- |
| Persistence | `src/features/plans/activity-changes.ts`, `repository.ts`; existing `use-plan.ts` queue unchanged |
| History / focus | `src/features/plans/editor-screen.tsx`, `src/features/revisions/history-dialog.tsx` |
| Calendar | `src/components/editor/deadline-picker.tsx`, `block-inspector.tsx`, `src/components/ui/calendar.tsx`, `popover.tsx`, `src/app/workspace.css`, package manifests |
| Notifications | `src/lib/notifications.ts`, `src/components/ui/sonner.tsx`, `dialog.tsx`, `src/app/surfaces.css`; toast imports in dashboard, editor, import/export/share/history and renderer |
| Tests | persistence/notifications unit tests; new `tests/e2e/ux-reliability.spec.ts`; existing workflow/layout assertions adapted as described below |
| Evidence | this report, README and architecture links; screenshots/results outside tracked source |

## QA results

22 October 2026, Windows / Node.js 24.13 / isolated Chromium. Local server uses the optimized build on `http://127.0.0.1:3105`, and the normal Playwright command reuses that server.

| Command / check | Result |
| --- | --- |
| `npm ci` | PASS after adding calendar dependencies; lockfile installation reproduced |
| `npm run lint` | PASS, no warnings |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 49 tests / 8 files |
| `npm run build` | PASS |
| `npm start` + `npm run test:e2e` | PASS, 16 scenarios (12 previous + 4 maintenance scenarios) |
| Separate visual/DOM audit | PASS, 27 checks; 0 console errors/warnings, no horizontal overflow |
| Viewports | 1440×900, 1024×768, 768×1024, 390×844, 320×700 |

Unit coverage includes all requested task fields, task deletion/undo entity retention, nested reference creation/rename/URL/note/removal, repeated saves, untouched legacy events with unknown types/metadata, optional-field clearing and atomic rollback after activity write failure. Notification policy tests cover duration, duplicate suppression, replacement and warning/error priority.

Browser coverage includes direct edits followed immediately by History, immutable names versus revisions, reload, unclaimed Escape and editor selection, menu/dialog/lightbox/slash-menu priority, Russian accessible names and AX-tree inspection, keyboard date selection/removal and persisted ISO values at all five sizes, rapid revision/DOCX/JSON feedback, short success lifetime, error persistence beyond that lifetime, error priority, close-target bounds, and no modal dismissal on closing a toast. Existing stale-tab, revisions/restore, JSON import/export, rich text, document/workspace, custom fonts, image paste/drop/replacement, share snapshot/viewer refresh and A4/DOCX workflows pass unchanged.

The existing native-date `.fill()` test now selects a date through the calendar and additionally verifies its restored displayed date. Existing exact panel-position assertions wait for the import confirmation to disappear before measuring resting geometry; those assertions remain intact. The new notification scenario separately verifies reserved clearance while notifications are visible. No data, conflict, clipboard, snapshot or export assertion was removed.

## Screenshots and reproducibility

Artifacts: `C:/Users/ahmad/.codex/artifacts/ipos-3-0-1/`.

- `before/results.json` records the four original failures; `after/results.json` records 27 final checks.
- History: `before/history-1440.png` → `after/history-1440.png`; `after/history-390.png` verifies responsive explanatory copy.
- Calendar: `before/deadline-1440.png` → `after/calendar-1440.png`, `after/calendar-390.png`, `after/calendar-320.png`. All five widths have captures.
- Notifications: `before/toasts-390.png` → `after/notifications-390.png`; `after/notifications-320.png`, `after/error-390.png`. Success/error and close targets were visually inspected.
- `after/editor-*.png`, `history-*.png`, `calendar-*.png`, `notifications-*.png` cover all five requested sizes.

Browser script sequence: fresh context → create/edit task → add/name reference → history → responsive properties/calendar → save revision → DOCX/JSON → error injection for a failed clipboard operation → notification close → reduced-motion and accessibility-tree checks. Temporary scripts live outside source under `C:/Users/ahmad/.codex/tmp/ipos-3-0-1/`. The tracked Playwright scenarios reproduce the functional checks without these scripts.

## Confirmed limitations and follow-up

- No retroactive history reconstruction: old creation events retain the names that existed then. Edits made before this release without events cannot be recovered as activity. Saved revisions remain the only restorable records.
- Aggregation is at committed save boundaries; pausing for more than 700 ms while typing can produce another meaningful field-change event. There is no delayed historical rewrite/coalescing across committed saves.
- Baseline reproduction exposed a pre-existing selection issue: after contextual reference insertion, a subsequent native selection update can leave task properties selected until the user clicks the new reference. The workaround is to click the reference. This is outside these four fixes and should be handled in a separate selection-behavior change.
- Browser results use Chromium viewport emulation. Physical devices, Safari/Firefox and screen-reader audio output were not tested. Native date-control speech was replaced and AX names verified in English-locale Chromium, not claimed as a complete assistive-technology audit.
- Existing five high audit advisories in lint/development dependencies remain; no forced major dependency upgrade was applied. No backend, auth, cloud, schema migration, environment variables, logo/watermark or production deployment changes.

API references: [native date input behavior and date-only values](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date), [shadcn Calendar](https://ui.shadcn.com/docs/components/radix/calendar), [Radix Popover focus and Escape behavior](https://www.radix-ui.com/primitives/docs/components/popover), [shadcn Sonner](https://ui.shadcn.com/docs/components/radix/sonner). Exact Sonner, DayPicker locale and BlockNote Escape behavior were checked against installed package source.

## Git and release boundary

Branch: `fix/ipos-3-0-1-ux-reliability`, based on `73a6bd9`. Coherent commits cover activity reliability, focus keyboard handling, calendar localization, notifications, and final regression/evidence updates. The PR targets `main`; GitHub Actions and Vercel Preview must pass. No merge or production deployment is part of this release request. PR/Preview and final CI status are reported in the handoff and PR description.
