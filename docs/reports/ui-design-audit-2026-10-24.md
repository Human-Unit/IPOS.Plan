# IPOS.Plan UI/UX audit — 24 October 2026

## Scope, baseline and source integrity

Production source reviewed: `origin/main` at `5a57423` (including both recent dashboard hero improvements). Work is isolated in branch `design/ui-audit-2026-10-24`, worktree `D:/Workshop/Student Council/Plan Builder UI Audit`. The unmerged 3.3 feature branch and its local merge remain intact in the original checkout; they are not part of this release.

Browser plugin is not available in this session. The explicitly requested Playwright Chromium workflow uses fresh, disposable contexts, never the user's browser profile or IndexedDB. A synthetic 13-plan library includes long titles, five detailed briefs, deadlines/statuses, references, image blocks, saved names, revisions and activity. A separate fresh context tests an empty library. Only synthetic data is deleted in that isolated context. No database/schema, repository, autosave, portable-format or export-logic change is planned.

Before any UI edit: optimized baseline build compiled/prerendered successfully; Next.js 16.4.0 then stopped once with a critical security advisory. The permitted normal retry completed with the warning. Baseline visual QA used that original version; the release must resolve this separately from the design work. This is a dependency finding, not an observed visual defect.

## Initial rendered evidence (before implementation)

Artifacts: `C:/Users/ahmad/.codex/artifacts/ui-audit-2026-10-24/before/`. Audit runner: `C:/Users/ahmad/.codex/tmp/ui-audit-2026-10-24/audit.mjs`. The source of these observations is rendered screenshots and computed metrics in `before/audit.json`, not assumptions from CSS alone.

141 PNGs: 134 captured application states plus 7 empty-library views. Matrix: 320×700, 390×844, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080. Additional short states: 320×480, 768×480, 1366×500. Dashboard/library/no results/directory/delete/import/error/restore; workspace/outline/inspector/document/preview/focus/share/export/history; Viewer and A4 print. `print-a4.pdf` records the original print contract.

Baseline automated observations: **277 checks passed**, **0 console/page errors**, **0 warnings**. No page-level horizontal overflow was observed. Outline and inspector drawers are already present and operable below 1440 px; they are not missing features. Short dialogs can already scroll to their actions. These are existing strengths to preserve, not defects to invent.

## Prioritized issue inventory

| ID / priority | Observed result and reproduction | Before evidence / viewport | Remedy |
| --- | --- | --- | --- |
| V1 / P1 | At 320 px, the hero occupies roughly 395 px; the title wraps, and three full-width actions consume much of the opening screen. The primary create action is last in reading/tab order. Open a populated dashboard at 320×700. Contrast is strong and must remain so. | `dashboard-320.png`, `dashboard-390.png` | Keep dark-blue identity and exact title, refine mobile heading/copy spacing, make New Plan the first semantic action, retain secondary backup/import access. |
| V2 / P1 | Only the first plan appears selected/prioritized: white framed surface and blue left border, while equivalent rows below are plain. There is no visible selection or explicit priority meaning. Scroll to the 13-row library. | `library-1024.png`, `library-1440.png` | Give equivalent rows one treatment; reserve emphasis for actual hover/focus. Reduce duplicated summary spacing to improve scanning without dropping metadata or actions. |
| V3 / P1 | Saved-state text is 10 px on mobile; task labels, outline sublabels, quick insertion and inspector hints use 11 px. This is a density/readability issue; small size alone is not a WCAG contrast failure. | `workspace-320.png`, `workspace-1366.png`, `workspace-1440.png`, computed text metrics | Define UI caption/label/body tokens and apply a legible 12–13 px chrome scale, preserving document typography/font controls. Measure contrast rather than assuming muted text fails. |
| V4 / P1 | Mobile task quick actions are 28 px; toolbar icon slots are 32 px. They meet the 24 px minimum in sampled states, but are tight for touch. The mobile header and secondary toolbar compete for attention. | `workspace-390.png`, `inspector-390.png` | Improve touch targets and control grouping, use quieter secondary styling and clear selected states. Retain all modes, sharing, saved state and drawer entry points. |
| V5 / P1 | Short export dialogs scroll the entire panel: title and close control scroll away when reaching JSON actions. The actions are reachable, so this is not a scrolling trap. | `short-export-320.png`, `short-export-actions-320.png`; 320×480 | Separate bounded dialog body from persistent header/close and footer where present. Keep focus trapping, Escape and initiating-control focus return. Apply to import/export/share/history/template/restore/delete compositions consistently. |
| V6 / P2 | Spacious workspaces and narrow document reading views use visibly different chrome densities; references, selection, hints and metadata could communicate hierarchy more consistently. Original document content is readable. | `workspace-1366.png`, `workspace-1920.png`, `document-768.png`, `viewer-390.png` | Unify app chrome through tokens, improve selection/reference controls and screen-only gutters. Do not alter A4/DOCX formatting or remove document font loading. |
| V7 / P2 | Hero kicker is styled as a heavy badge, supporting copy is unusually bold, and decorative circle/shadow add weight relative to calm library rows. | `dashboard-1440.png`, `dashboard-320.png` | Keep the readable dark-blue hero, white text and restrained red accent; use a calmer typographic hierarchy and consolidate the repeated late overrides. |

## Code-level hypotheses to verify

`dashboard-hero.css` repeats kicker, heading, action and description rules late in the cascade. Consolidation is a maintainability improvement; duplication itself is not a rendered defect. `.plan-row:first-of-type` is the source of V2. Potential app-token leakage into print must be tested with the original print metrics/PDF, not asserted from code inspection. No missing user data, broken autosave, broken snapshots, inaccessible drawer or failed restore was observed in this baseline pass.

## Implementation and after evidence

### Design system and implementation inventory (before coding)

Coordinated dashboard and editor concepts were generated with the built-in image tool from the actual baseline screenshots, then inspected with `view_image`. Reference files are `C:/Users/ahmad/.codex/generated_images/01a134d9-2aed-77f1-84c9-5f4516aa7291/exec-99d35ecb-2dc2-4ba5-9248-05d22ec6fbcd.png` and `exec-25afdae3-0cf3-46a4-bb30-999bb0a59d7e.png`. Prompts lock existing information architecture, Russian labels, official identity and practical HTML/CSS controls. Concepts are review artifacts, not shipped UI or replacement emblems.

Visual specification: existing neutral `#F7F7F5` canvas, true white content, blue `#132FC1`, UI text `#172033`, secondary UI text `#525B6B`, subtle borders `#DCE1E9`. Use Inter for chrome and Montserrat for headings. UI scale: 12 px captions, 13 px labels/controls, 14 px supporting text, 17–18 px section headings; mobile saved state at least 12 px. Shared radii 6 px controls, 10 px panels/dialogs and 12 px hero; spacing multiples of 4/8 with 16/24 px groups. Restrained elevation only for real overlays. Define separate UI tokens, keeping document and print variables unchanged.

Dashboard: centered existing content width and margins; readable dark-blue hero with plain existing kicker, exact title/copy, a white **Новый план** primary action first in semantic order, then **Резервная копия** and **Импорт JSON**. Mobile primary spans the action grid; very narrow screens stack all actions. Quiet task summary → search/filter → existing saved-name disclosure → uniform plan rows. Preserve complete titles, summaries, counts, dates, progress and duplicate/delete actions. Equivalent rows use a consistent thin border/white surface; emphasis follows hover/focus, not index.

Editor: retain current mode toggle, saved indicator, preview/focus/more/share actions and all task/panel controls. Group the header consistently with the dashboard's type and border system, use legible supporting text, improve touch sizes without eliminating controls, and preserve the 1440 px wide-panel / below-breakpoint drawer architecture. White fluid workspace and original A4 document remain distinct. Improve screen selection/reference/metadata treatment without modifying BlockNote projection, state, IDs or font-loading behavior.

Dialogs: existing Radix primitive and focus behavior; add one reusable scroll-body composition so the title/close and footer stay available while long content scrolls. Apply to import, export, share, revisions, templates and recovery; preserve existing action labels, explanations, errors and destructive confirmation. No replacement UI library or data-flow rewrite.

Intentional concept deviations required by the brief: keep canonical document text/font choices and real fixture data rather than copying any generated sample spelling/count changes; keep the genuine repository emblem rather than the generated approximation; keep the existing footer in document flow so it cannot cover rows. No new sidebar routes, fake metrics, fixed footer or image-rendered controls are introduced. Existing icon metaphors come from Lucide. All before/after state names and viewport sizes remain identical; deterministic synthetic IDs/timestamps make library ordering reproducible.

### Additional measured findings

V8 / P1: original input and textarea placeholders (`#787E89` on white) measured **4.08:1**, below the 4.5:1 normal-text target. This was confirmed in the rendered dashboard, task search and import dialog, rather than inferred from small type. Updated shared placeholders to `#697180` (approximately 4.91:1). Evidence: computed placeholder measurements in the audit session; final `after/contrast.json`.

V9 / P1: expanded keyboard tests found that an always-mounted, initially closed drawer captured its return-focus target too early. `DialogContent` now captures it on each opening as well as retaining the menu-trigger fallback. Testing this exposed ProseMirror focusing its text surface during a task-properties click. The actual properties button now explicitly retains focus before opening the drawer, so closing it returns to the initiating control without selecting the hidden duplicate document heading. This changes focus handling only; editor projection, selection algorithms and stored content are unchanged. The original content-heavy workspace regression and new drawer-return tests cover both cases.

### Implemented changes and rationale

The hero keeps the dark-blue background, exact Russian title/copy and restrained red accent. Removed the heavy kicker badge/circle and consolidated its stylesheet into a single responsive composition. `data-primary-action` identifies the create action instead of relying on child position. Equivalent plan rows now have equal white surfaces, thin borders, complete existing content and a focus/hover treatment. Supporting text, borders and radii use shared UI tokens; document font variables remain intact.

Workspace chrome uses 12–13 px supporting text, quieter secondary controls, a clear mode selector and 44 px mobile header/task actions. The established wide panels at 1440 px and drawers below that breakpoint remain. Screen-only brief metadata/reference/target styles cannot affect print. All existing font-selection and external-font loading functionality remains.

`DialogBody` is shared by import, export, share, history, templates, delete and restore dialogs. Long descriptions belong to the scrollable body, leaving compact titles, close controls and existing footers available at short heights. Radix handles focus trapping and Escape; toast clearance rules remain. Drawers retain their own scrolling composition. Existing handlers, warnings, descriptions and recovery choices remain.

Next.js and its matching ESLint config were patched from **16.4.0 to 16.4.1**, with no added dependency. Baseline `npm audit` reported the affected Next package as critical; the minimal patch clears the audit and the build warning. Sources: [image optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [typed-array cache advisory](https://github.com/advisories/GHSA-673q-mjm6-r5xr), [Server Actions advisory](https://github.com/advisories/GHSA-p3m5-59mp-jv5r).

### Before/after evidence and fidelity ledger

All seven viewport/state names match under `before/` and `after/`. Each directory contains **157 PNGs**: the original 141-state matrix plus 15 hover/focus/error/editing captures and one loading capture. Loading was observed by delaying IndexedDB's open completion in a disposable context, allowing the real loading UI to render. No production code was changed to manufacture the loading state. Native concept comparisons add `after/concept-dashboard-1586.png` and `after/concept-editor-1586.png` at **1586×992**. Large images and temporary runners are outside Git.

| Comparison point | Concept / baseline evidence | Latest rendered evidence | Result / intentional difference |
| --- | --- | --- | --- |
| Hero hierarchy and palette | Dashboard concept: navy band, plain kicker, white primary action, restrained red accent | `after/dashboard-1440.png`, `after/dashboard-320.png`, native dashboard capture | Preserved navy/white identity, 42 px desktop heading and compact mobile title; create action first. Canonical product copy retained. |
| Container and spacing | Dashboard concept: centered narrow library, open inline summary, uniform rows | `after/library-1024.png`, `after/dashboard-1440.png` | Same centered 1184 px outer container; summary/search/library sequence retained. Equal rows replace first-row false priority. |
| Typography and control text | Both concepts: readable Inter chrome and Montserrat hierarchy | `after/workspace-390.png`, `after/inspector-1440.png`, `after/states.json` | 12 px supporting text and 13 px controls; mobile save text no longer 10 px. Document title/body/font choices intentionally retain the original contract. |
| Editor architecture | Editor concept: outline, white content canvas, right inspector; quiet top controls | Native editor capture, `after/workspace-1366.png`, `after/outline-1024.png` | Wide three-region composition available; original assignment/search modules retained rather than replacing them with generated sample content. Below 1440 px, existing drawer architecture preserved. |
| Task selection and references | Editor concept: thin blue selection edge, quiet reference surface | `after/inspector-1440.png`, native editor capture | Existing blue selection semantics retained, reference borders/radii and metadata normalized. Actual fixture content/images preserved. |
| Dialogs and short screens | Before: title/close scroll away while reaching actions | `after/short-export-320.png`, `after/short-export-actions-320.png`; focus/scroll regression | Title/close/footer stay available; body scrolls. Mobile task controls deliberately wrap onto a separate line to keep touch targets usable. |
| Official branding and footer | Concepts contain generated seal approximation and a fixed footer suggestion | Native dashboard/editor captures | Genuine repository seal preserved; footer stays in normal flow to avoid covering library rows. No generated screenshot is shipped as UI. |

The concepts and latest browser captures were inspected with `view_image`, including native dimensions. The restrained visual system is consistent across the dashboard, workspace, document/viewer chrome and dialogs. Differences above follow the explicit preservation requirements, rather than introducing a new product architecture.

### Accessibility and contract verification

Final sampled contrast scan: **259 visible text/placeholder samples across seven dashboard/import/workspace/inspector states, zero failures** against 4.5:1 normal text / 3:1 large text thresholds. Hero gradient samples use the lighter endpoint. This is targeted rendered evidence, not a claim of a complete WCAG certification or a replacement for assistive-technology testing. Disabled controls are excluded.

The common seven-width capture runner reports **277 checks passed, zero horizontal-overflow failures, zero console/page errors and zero warnings** after the redesign. Mobile header actions and quick task actions use 44 px targets. Keyboard tests cover drawer access, initiating-control focus return, modal Tab containment, Escape, short-body scrolling and fixed close/footer controls. Reduced-motion preferences remain respected.

The 1440×900 A4 screenshot is **pixel-identical** before/after. Both PDFs contain **four pages**, with identical page geometry and identical decoded page content streams on every page (`pypdf` comparison). The new print regression also checks 178 mm printable width, 23 px task headings, original 11 px print metadata and hidden editor chrome after switching from a 320 px screen. Print CSS and DOCX implementation are unchanged.

### Changed files

- UI tokens and styles: `src/app/globals.css`, `surfaces.css`, `dashboard-hero.css`, `workspace.css`, `document.css`.
- Shared modal composition/focus: `src/components/ui/dialog.tsx`; task-properties focus: `src/components/task/task-card.tsx`.
- Composition consumers: dashboard, import/export/share/history dialogs, template dialogs and backup menu under `src/features/`.
- Regression checks: `tests/e2e/ui-design-audit.spec.ts`; import-route readiness in `tests/e2e/productivity.spec.ts` (wait for the real editor URL before recording it, rather than accidentally using the import preview).
- CI: Playwright uses the already built production server in CI; failed browser traces are retained for seven days. Existing checks and DOCX archive validation remain.
- Security patch: `package.json`, `package-lock.json`. No storage, migrations, repositories, autosave, schemas, serializers, font loaders, print CSS, DOCX generator or unrelated 3.3 feature files changed.

### Local commands and release gate

`npm run lint`, `npm run typecheck`, `npm run test` (**94 tests**), `npm run build` and `npm audit` pass. **All 24 Playwright tests pass (2.9 minutes)** against the optimized production server, including existing editing, undo, stale-tab protection, IndexedDB reload, JSON, backup/recovery, templates, revisions, snapshot immutability, media bytes, editable DOCX and print checks. A first complete run exposed the focus/duplicate-heading interaction described in V9; the targeted regression and subsequent complete run pass after the focus fix. GitHub CI and production evidence are recorded in the release PR.

Vercel authentication and project context were verified: `diamond-dogs2/ipos-plan`, project root (`rootDirectory: null`, meaning repository root), GitHub link `Human-Unit/IPOS.Plan`, production branch `main`. The release uses the native Git integration after passing checks; no environment variables, backend, database or platform-protection changes are required. The final production deployment ID/SHA, READY status and public-browser QA results are recorded in the release PR and handoff after deployment, avoiding a self-referential commit hash inside this report.

Remaining coverage limits: Chromium desktop/mobile viewport emulation only; no physical iOS/Android device, Safari/Firefox, screen-reader certification or installed Microsoft Word visual inspection. Fonts and Word pagination still depend on fonts available to the recipient, as the existing export UI explains. No user browser profile or real library was accessed or reset.
