# IPOS.Plan — UI/UX redesign and implementation

Date: 2026-10-25 (Asia/Tashkent). Baseline: `33d70f7` on `origin/main`.
Working branch: `design/ipos-plan-full-redesign`.
Checkout: `D:/Workshop/Student Council/Plan Builder Redesign`.

## Scope and product model

This pass implements the supplied full redesign brief. It covers the dashboard, editor navigation and chrome, authoring presentation, shared dialogs, menus, empty/error/loading states, preview, and the read-only viewer. The existing 3.3 checkout was clean and two commits ahead of its upstream; it was preserved in its original worktree. Main was also preserved. Publication is outside this brief: the requested handoff is a committed working branch, without a merge or production deployment.

The implementation follows root `AGENTS.md` and the IPOS design playbook. Paykar's principles, audit, design-system, route-matrix, implementation-plan, operational UX rules and hero QA documents informed the method. Their commerce branding, routes and backend instructions were not adopted.

The workflow map used for this review:

| Entry | User job | Existing implementation boundary |
| --- | --- | --- |
| `/` | Find, create/import, duplicate/delete and back up plans; inspect task totals and remembered names | Dashboard, Dexie live queries, plan repository, productivity selectors, backup menu |
| `/plan/[id]` | Author briefs, navigate tasks, edit properties, review versions, preview/share/export | `usePlan` owns autosave/flush/conflicts; BlockNote owns editing and undo; projected briefs retain portable source data |
| `/view#p=…` | Read an immutable shared snapshot | Hash codec and read-only renderer, independent of later source edits |
| Dialogs and menus | Validate imports, recover data, export, share and confirm destructive actions | Existing Radix/shadcn primitives and feature handlers |
| Print / Word | Produce an A4 document | Independent print stylesheet and DOCX generator |

## Observed problems and priorities

These findings came from rendered baseline captures, not CSS inspection alone. P1 denotes meaningful usability friction; no P0 data-loss finding was observed.

| ID | Priority | Page/state and evidence | User impact | Implemented response / protected behavior |
| --- | --- | --- | --- | --- |
| U01 | P1 | Populated dashboard, 390px: hero, totals, search and remembered-name disclosure precede the first plan; first row starts around y=753 | Opening a recent plan requires scrolling past supporting content | Shorter hero; retrieval tools grouped with the library; remembered names below plans. Every action and name remains available |
| U02 | P1 | Editor, 320/390px: identity, mode selection and actions occupy three header rows | Less room for the document on a phone | Two-row mobile header with named 44px action targets, preserved save feedback and keyboard mode control |
| U03 | P1 | Outline drawer, 768px: assignments and all filters precede document structure; structure starts around y=720 | Navigation is buried inside its own drawer | Structure is the initial view; a separate Tasks option contains search and assignments. The existing search shortcut reveals and focuses search |
| U04 | P2 | Dashboard, 1440px: separate row cards, repeated framed emblems, several independent control bands | Weak grouping between finding a plan and opening it | One library surface, contiguous rows, document icons and consistent metadata/progress/actions; official emblem retained in product/document identity |
| U05 | P2 | Editor, 1440px: wide title and brief-description measure, weak boundary between canvas and surrounding UI | Harder to scan the document and its metadata | Bounded title/description measure, a restrained authoring surface and a quiet task-facts strip; print formatting stays independent |
| U06 | P2 | Editor, 1366px: navigation and properties are modal despite sufficient width for a useful document and panels | Repeated modal opening during laptop work | Persistent resizable panels from 1200px; drawers retained below that breakpoint |
| U07 | P2 | Import/export/share and narrow controls: UI text sizes and action density vary | Reading and touch use feel less consistent across flows | 14px default buttons, scoped form typography, larger mobile text fields, shared radii and 44px mobile menu actions |

Source review also found a duplicated dialog-body style block nested inside the mobile notification rule. That was a maintenance finding, not a claimed visual failure. It was consolidated while preserving the notification clearance rule; short-dialog and notification regressions pass.

## Design foundation and implementation

The visual direction is an academic editing workspace: institutional blue, the real MSU seal, Montserrat headings, Inter interface text, white surfaces and a cool neutral canvas. It uses existing semantic colors, spacing and component primitives. No production raster UI assets were added.

| Area | Decision and reason |
| --- | --- |
| Brand and hero | Keep the official identity and `Контент-планы`; use a solid navy hero with one clear New Plan action. Remove the repeated kicker, accent ornament and gradient. Desktop hero is about 148px high |
| Library | Keep the 1184px outer container and 1120px desktop content width. Combine heading/count, backup/import, search/filter and contiguous plan rows in one surface |
| Totals | Four compact number/label groups on desktop, two columns on phones. Preserve real overdue/completed meanings and text labels |
| Editor shell | Add the official emblem to editor identity; make the active mode a quiet white segment. Group jump controls, secondary tools and panel toggles |
| Navigation | Separate Structure from Tasks using the installed single-selection ToggleGroup. Keep inactive content mounted while switching options so search filters survive that switch. Preserve selection, assignments and insertion controls |
| Responsive panels | Use one 1200px breakpoint in both CSS and the existing media-query subscription. The 1366px capture verifies document, outline and inspector together |
| Authoring | Keep document font choices; limit workspace title width and description measure to 68ch. Add a neutral metadata strip and subtle canvas boundary only for screen media |
| Dialogs and feedback | Retain the existing fixed header/footer and scrolling body composition. Unify supporting typography and menu target sizes; retain errors, recovery actions and focus return |
| Print/viewer | Keep the read-only document and physical A4 treatment. Screen authoring changes are explicitly scoped away from print |

### Concept comparison and deliberate adaptations

ImageGen concepts were generated from actual baseline screenshots, then compared directly with final browser captures. The editor concept was revised to remove a duplicate assignments list above Structure.

- The implemented solid navy hero, neutral canvas, library grouping, contiguous document rows, mode selector, navigation options and facts strip follow the chosen direction.
- The existing centered dashboard width takes priority over the generated mockup's wider framing, as required by the IPOS playbook.
- Actual fixture titles, counts and all 13 plans take priority over illustrative mockup rows. The long-title case remains in the browser evidence.
- Existing six insertion controls remain available individually; the concept's generic Add Block button was not substituted for them.
- Search keeps the existing native input, and filters retain native selects. No registry replacement, new dependency or custom filtering logic was introduced.
- Below 375px, the visible workspace-mode label shortens to `Стол`; its accessible name remains `Рабочий стол`. Narrow panel/action icons retain explicit accessible names.

## Before/after evidence

Screenshots, PDFs, downloads, matrix JSON and temporary QA scripts are retained outside Git. These links resolve in this Windows workspace; they are not hosted public artifacts.

Artifact root: `C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/`.
Scripts: `C:/Users/ahmad/.codex/tmp/ipos-redesign-2026-10-25/`.

| State | Baseline | Final optimized build |
| --- | --- | --- |
| Dashboard, 1440×900 | [Before](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/before/dashboard-1440.png) | [After](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/final/dashboard-1440.png) |
| Dashboard, 390×844 | [Before](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/before/dashboard-390.png) | [After](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/final/dashboard-390.png) |
| Editor, 1440×900 | [Before](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/before/workspace-1440.png) | [After](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/final/workspace-1440.png) |
| Editor, 390×844 | [Before](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/before/workspace-390.png) | [After](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/final/workspace-390.png) |
| Outline drawer, 768×1024 | [Before](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/before/outline-768.png) | [After](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/final/outline-768.png) |
| Short export, 320×480 | [Before](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/before/short-export-320.png) | [After](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/final/short-export-320.png) |
| A4 print | [Before](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/before/print-1440.png) | [After](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/final/print-1440.png) |

[Responsive overview](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/final/responsive-review.jpg) · [Secondary states overview](C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/final/secondary-review.jpg).

## Responsive and accessibility verification

Rendered through Playwright Chromium at `http://127.0.0.1:3105`. The Browser plugin/browser skill was absent; the available Browser Use connector is a separate service, so regular local Playwright was used. All contexts were disposable and isolated from the user's browser profile and documents.

The flow under test was: dashboard → find/create/import a plan → author and navigate tasks → save/reload → preview/export/share → read the immutable snapshot → restore or recover data safely.

| Width × height | Final first plan y | Editor header height | Panel treatment | Overflow |
| --- | ---: | ---: | --- | --- |
| 320×700 | 669 | 111 | Drawers; compact named controls | None |
| 390×844 | 641 | 111 | Drawers; two toolbar rows | None |
| 768×1024 | 522 | 111 | Drawers; deliberate two-row top bar | None |
| 1024×768 | 503 | 111 | Drawers; readable document | None |
| 1366×768 | 514 | 65 | Persistent resizable panels | None |
| 1440×900 | 514 | 65 | Persistent resizable panels | None |
| 1920×1080 | 514 | 65 | Bounded canvas and centered library | None |

The 390px first row moved upward by roughly 112px; the 1440px first row moved from roughly y=612 to y=514. Baseline coordinates are read from matching screenshots; final coordinates are measured in `final-anchors/audit.json`. On a 320×700 screen, the first row starts near the lower edge and the library naturally scrolls; content is not clipped or reduced to fit an arbitrary fold.

- Baseline matrix: 134 measured captures, 277 checks passed.
- Final optimized-build matrix: 133 measured captures, 275 checks passed, zero browser errors or warnings. The count differs because 1366px no longer needs the separate outline-drawer case.
- Covered dashboard populated/fresh/search-empty/long titles/names; editor Workspace/Document/Focus/preview; outline/inspector; import and invalid JSON; backup restore; export/share/history/delete; viewer; A4; 320×480, 768×480 and 1366×500 dialog cases.
- Additional rendered hover, keyboard focus, validation-toast, invalid-viewer, editing and loading-state captures are in `after/`. Loading was exercised by delaying IndexedDB opening in a disposable context, not by changing application code.
- 256 sampled functional text and placeholder contrast checks passed their 4.5:1 or large-text 3:1 thresholds. This is a sampled check, not a full WCAG conformance audit.
- New tests cover Structure/Tasks selection, retained search filters, shortcut focus after drawer remount, assignment jumps, unchanged portable content and 320/390px keyboard mode switching.
- Existing tests cover focus containment/return, Escape, error notifications, native deadline keyboard selection, resizing, undo and touch-sized editor controls.

## Engineering and functional results

| Command/check | Result |
| --- | --- |
| `npm ci` | Pass; existing lockfile, zero vulnerabilities reported; no dependency changes |
| `npm run lint` | Pass, no warnings after cleanup |
| `npm run typecheck` | Pass |
| `npm run test` | Pass: 94 tests in 12 files |
| `npm run build` | Pass: optimized Next.js 16.4.1 build |
| `npm run test:e2e` | Pass: all 26 tests against the optimized build, 2.3 minutes |
| `git diff --check` | Pass |
| Explicit optimized-build smoke | 17 checks passed; dashboard and `/view` refresh HTTP 200, no console/runtime errors |
| Downloaded DOCX | ZIP CRC valid; all eight XML/relationship parts parse |
| A4 regression | Four pages before and after; page geometry and decoded page content streams identical; print screenshots pixel-identical |

The first focused run caught a real new bug: a freshly mounted drawer opened from Search initialized to Structure. The initial section now respects a search request, and the Structure shortcut resets that intent. The added regression passes. The keyboard test was corrected to activate the focused radio with Enter.

The first complete suite finished with 25 passes and one outdated selector: the old test clicked the full visible `Рабочий стол` text, which is intentionally shortened at 320px. That assertion now uses the unchanged accessible radio name. No functionality assertion was removed, and no retries or broader timeouts were added.

Critical verified contracts: plan creation/edit/reload, task status and properties, task/block operations, BlockNote undo/redo, references and portable image bytes, typography and font choices, autosave and stale-tab protection, revisions, backup/restore, JSON download/reimport, editable Word output, read-only preview/viewer, sharing in another tab, immutable old snapshots after source edits, and direct `/view` refresh.

No changes were made to IndexedDB schema, repositories, autosave logic, portable schemas, serializers, share codec, DOCX generation, print stylesheet, font-loading pipeline, backend, environment configuration or dependencies.

## Files changed

- `src/app/globals.css` — canvas and scoped application control typography.
- `src/app/surfaces.css` — library composition, responsive utilities, disclosure, dialogs and menus; remove duplicated notification-scoped dialog styles.
- `src/app/dashboard-hero.css` — compact solid-blue hero and one primary action.
- `src/app/workspace.css` — editor header, grouped controls, navigation selector, panel breakpoint and responsive composition.
- `src/app/document.css` — screen-only authoring surface, reading measure and task metadata grouping.
- `src/features/plans/dashboard.tsx` — retrieval-first grouping, document icons and names disclosure placement.
- `src/features/plans/editor-screen.tsx` — shared emblem, compact visible labels and explicit accessible action names.
- `src/components/editor/plan-outline.tsx` — separate Structure and Tasks views without changing the document or search data.
- `src/components/editor/plan-renderer.tsx` — grouped toolbar, search/structure selection intent and matching 1200px breakpoint.
- `tests/e2e/full-redesign.spec.ts` — two focused navigation and keyboard regressions.
- `tests/e2e/assignments.spec.ts` — use the new Tasks view before assignment navigation.
- `tests/e2e/editor-layout.spec.ts`, `redesign.spec.ts`, `ui-design-audit.spec.ts` — verify the intentional 1200px panel boundary.
- `tests/e2e/workspace-3.spec.ts` — use the stable accessible mode name at narrow widths.
- This report.

## Remaining limits and handoff

Browser checks use Chromium viewport emulation. Physical iOS/Android devices, Safari, Firefox, screen readers and actual Microsoft Word rendering were not tested. Native mobile zoom behavior is not claimed as verified. The document's existing font choices remain available and dependent on the existing font sources.

All screenshot acceptance is based on rendered screenshots reviewed at matching sizes, with overview sheets used for the broader state matrix. The baseline and first iterations used the development server; final captures and the complete regression suite use the optimized local build. No public production acceptance or deployment is claimed for this redesign.

The completed implementation and this report are committed together on the dedicated branch. The release boundary is local branch only: no merge, push or deployment was performed.

### Subsequent release validation

The user subsequently authorized pushing the branch and merging it into main. [PR #21](https://github.com/Human-Unit/IPOS.Plan/pull/21) runs the same checks in GitHub Actions before release.

The first [Linux CI run](https://github.com/Human-Unit/IPOS.Plan/actions/runs/40190273278) passed the static/build checks and 25 browser tests, then exposed a timing error in the existing media test. Its retained trace shows the image was visible and present in exported JSON, but the test reloaded while the save indicator still reported pending changes. Export intentionally reads the current draft without flushing the 700ms autosave. The test now explicitly awaits the saved indicator before checking persistence after reload. No application or storage behavior was changed. The failure archive is retained locally at `C:/Users/ahmad/.codex/artifacts/ipos-redesign-2026-10-25/ci-failure.zip` and in the linked GitHub run.
