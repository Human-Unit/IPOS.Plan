# IPOS.Plan — Design Playbook

Status: **project-specific design guidance** for `Human-Unit/IPOS.Plan`.
Inspired by the methods documented in the [Paykar reference library](paykar-reference/README.md). This document is the **implementation guidance for IPOS.Plan**; the copied Paykar documents are historical examples, not instructions to change IPOS to Paykar.

## 0. Read this first

Before any UI/UX change:
1. Read the root `AGENTS.md` and any more-specific instructions.
2. Inspect `src/app/globals.css`, `surfaces.css`, `dashboard-hero.css`, `workspace.css`, `document.css`, `print.css`, and `layout.tsx` (note cascade order).
3. Inspect `src/features/plans/dashboard.tsx`, `editor-screen.tsx`, `src/components/editor/plan-renderer.tsx`, and the components directly affected.
4. Read the Paykar reference `docs/design-principles.md`, `docs/ui-coherence/design-system.md`, `docs/ui-coherence/audit.md`, `docs/ui-coherence/route-matrix.md`, and `docs/ui-coherence/implementation-plan.md` for **methodology**. Use `docs/admin/admin-ux-rules.md` for dense operational UI patterns and `docs/progress/homepage-hero.md` for a measurable hero QA example.
5. Inspect current screenshots in a running browser before claiming any visual finding. Source inspection alone is not visual verification.

## 1. Product identity, goals, and non-goals

IPOS.Plan is a local-first Russian-language media-sector planning and document-authoring application. Its main jobs are: find a plan, create/import it, review work due, edit briefs and tasks, inspect assignments, save revisions, share an immutable view, and export or print documents.

**Design direction:** composed academic/professional productivity workspace with the MSU/IPOS identity. Quiet white/off-white surfaces, deep institutional blue for brand and primary action, restrained red for alert/destructive context, dark legible text, helpful spacious margins, clean typography and precise affordances. The document is the central working object.

**Do not import from Paykar:** grocery visuals, commercial green `#00A82D`, ecommerce copy/cards, dark storefront presentation, Paykar auth/admin/backend policies, category imagery, product/price metrics, or its route-specific CSS numbers. Paykar's documents are **method examples**, not design tokens or engineering mandates for IPOS.

Do not "upgrade" by adding stock images, excessive gradients/glass/glow, animated blobs, dashboard decoration, cards around every paragraph, large empty ornamental heroes, or brand changes. No invented user data, collaborators, progress metrics or productivity claims.

## 2. Layout and spacing

- Retain a centered, relatively narrow dashboard. Current desktop `.dashboard` uses `max-width: 1184px`; change only after equivalent viewport screenshots justify it.
- Prefer generous side margins and deliberately placed negative space. Use approximately 32px page gutters on wide screens, 24px on tablet, 16px on mobile (subject to actual container and safe-area constraints).
- Document/print remains A4-oriented. Preserve `.plan-paper` sizing around 210mm and the current print-only 178mm page width; workspace mode may use its intentionally wider canvas. Do not stretch article-like or document prose edge to edge.
- Use the existing scale from `globals.css`: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48px, with occasional 64px separation for major sections. Don't replace intentional dense editor spacing blindly.
- Prefer one clear surface boundary per grouping. Avoid nesting multiple borders, tinted backgrounds, and shadows around the same decision.
- Design for the content: long Russian plan names, dates, task metadata, saved people's names, references, errors and editing controls must wrap gracefully. No layout hacks dependent on a short demo string.

## 3. Typography and color

- Preserve **Montserrat** for headings and **Inter** for UI, and keep independent document typography settings editable. If a real font-loading issue is found, fix it without removing the document font choices.
- Establish a practical hierarchy: hero title roughly 38–52px desktop / 32–39px mobile; page/section headings distinct from row titles; standard interface text roughly 14–16px; supporting text generally 13–14px. Avoid relying on widespread 10–11px text for important labels or actions.
- Metadata may remain compact where readable, but prioritize visual testing and actual contrast over fixed type sizes. Form inputs on mobile must remain easily readable and usable without iOS zoom.
- Maintain the existing semantics: `--primary`, `--foreground`, `--muted-foreground`, `--border`, `--destructive`; do not invent a parallel palette or paint every card blue.
- Contrast: body/functional text aims for at least WCAG AA 4.5:1, large text 3:1; meaningful icons/visible boundaries 3:1 where applicable. Selected, error, overdue and completed states must not rely on color alone.
- Keep keyboard focus visible, including inside the dark hero; reduced motion is a first-class condition.

## 4. Canonical interface components and decisions

| Surface | Primary job | Preserve | Refine based on rendered evidence |
|---|---|---|---|
| Top app bar | Identify workspace and storage mode | MSU emblem, IPOS.Plan branding, local-state truthfulness | Compact alignment, long-screen/mobile behavior, contrast |
| Dashboard hero | Orient and create a plan | Russian `Контент-планы`, deep blue high-contrast hero, actions | Kicker/heading/copy hierarchy, mobile wrap, spacing, action order |
| Summary statistics | Surface actual task state | Correct unfinished, overdue, upcoming, done counts | Scannability, meaningful urgency, no giant decorative KPI tiles |
| Library search/filter | Retrieve actual plans | Search/filter/reset behavior | Label clarity, field alignment, small screens |
| Plan rows | Open/track/duplicate/delete | Data, progress, date, task summary, accessible actions | Consistent row treatment; `.plan-row:first-of-type` currently differs visually; test whether justified |
| Remembered names | Reuse names from assignments | Disclosure that this is **not** a verified roster | Calm progressive disclosure, readable list |
| Editor header | Mode switch, status, preview, share | Save status, Workspace/Document, Focus, Share, more actions | Clear priority, keyboard and mobile usability |
| Outline and inspector | Navigate tasks and edit properties | Task jumps, panel data, resize/drawer behavior | Discoverability around 768–1439px, density/scrolling |
| Document/brief | Author and read content | BlockNote behavior, document style controls, task fields, references/media | Content hierarchy, readable line length, clear selected state |
| Modals and toasts | Guide safe actions | Validation, destructive confirmations, backup/restore flow | Consistent spacing, focus/scroll containment, visible errors |
| Share and print | Present trustworthy output | Immutable share snapshots; read-only view; A4; DOCX/JSON | Consistent visual identity without impacting output semantics |

**Action hierarchy:** generally one obvious primary action per decision group; secondary outline/neutral actions; quieter utility actions in accessible menus; destructive operations separated and confirmed. Hero's "Новый план" should be the strongest action. Do not hide backup/restore access.

**Empty/loading/error states:** show a genuine recovery or meaningful next action, not fake data or an ornamental void. A new library should clearly offer plan creation/import and explain local storage. Filtered zero results should suggest clear/reset. An IndexedDB failure, save conflict, or import validation error must be explicitly visible with recovery options, not silently treated as empty success.

## 5. Engineering and data safety

Strictly presentation-first. Preserve:
- Dexie/IndexedDB schema, browser-origin storage, data persistence and all existing documents/revisions/assignments;
- autosave, flush-before-navigation/share, multi-tab save-conflict behavior and error reporting;
- BlockNote structure, task statuses, references/media, editing, keyboard shortcuts and undo;
- create, import, search, filter, duplicate, delete with confirmation, revisions, backup/restore;
- JSON/DOCX exports, shared immutable `/view#p=…` snapshots and A4 print rendering;
- loading, error, disabled/selected, focus, toast and read-only semantics.

No auth/backend/DB migration, API, schema, storage reset, dependency swap, document serialization or production data mutation for an aesthetic task. Keep the existing Russian UI copy and factual local-storage disclosure. Do not change published data formats.

Adjust design via existing tokens and targeted components. Consolidate contradictory cascade/duplicate CSS cautiously, especially `dashboard-hero.css`. Shared CSS changes require checking every route, editor, dialogs and print. Do not alter CSS selectors used by BlockNote/printing without proof and regressions.

## 6. Paykar-derived audit method: evidence, not aesthetics by assertion

For every proposed issue: record **page/state → viewport → observed symptom → user task blocked or slowed → severity (P0/P1/P2) → recommended change → protected behavior → verification**.

Start with a keep/refine/remove matrix. Clearly distinguish:
- **Observed**: actually captured in browser.
- **Inferred**: detected from source/CSS but unverified visually.
- **Blocked**: missing browser/test access, not claimed as passed.

Work through these phases:
1. **Baseline:** identify exact commit, review dirty worktree, take before screenshots with isolated browser storage and realistic seeded demo data.
2. **UX audit:** list jobs-to-be-done for plan retrieval, task editing, sharing, exporting and safe recovery; prioritize real friction.
3. **Foundation:** choose token and type/spacing adjustments in one place; use opt-in/limited selectors to avoid breaking print and editor.
4. **Anchor screens:** refine dashboard, populated plan/editor, and readonly document together before global propagation.
5. **Secondary flows:** filters, directories, dialogs, import/export, history, error/empty states and mobile drawer.
6. **Responsive + accessibility acceptance:** inspect same states across widths and input modes, fix clipping and focus issues.
7. **Release report:** compare before/after, run tests, report regressions and deployment state honestly.

Suggested report location: `docs/design/reports/ipos-ui-audit-YYYY-MM-DD.md`. Include references/screenshots and a final verified/blocked checklist. Never mark visual QA passed based only on lint/build.

## 7. Acceptance and test matrix

Minimum viewport widths: **320, 390, 768, 1024, 1366, 1440 and 1920px**. Use consistent heights and screenshot fixtures for comparisons. Test:
- dashboard fresh/populated/search-empty and long plan titles;
- editor Workspace/Document, focused and default, document/outline/inspector and long task content;
- backup, restore, import, export, share, history and delete dialogs;
- read-only shared view including invalid snapshot state;
- keyboard tab/focus, Enter/Escape, coarse touch targets, reduced motion and print preview;
- modal scrolling on short-height phones; no essential action obscured;
- no unintended horizontal document scrolling or clipped interactive controls.

Run from the IPOS repository: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`. Use isolated testing storage; do not modify or delete real browser documents. Record actual results, not expected results.

When specifically authorized to publish, deploy the **tested SHA** through the existing main/Vercel workflow and confirm production `READY`; for audits/planning only, don't release code automatically.

## 8. Source provenance and priority

Paykar's copies under `docs/design/paykar-reference/docs/` are **historical design research examples**. They can contain grocery-specific metrics, backend directives, local paths, old status reports, proposal-only features and screenshots not copied into IPOS. Treat those as context, **never as IPOS requirements**.

Priority: current user task and repository's actual constraints → root `AGENTS.md` → this IPOS playbook → current validated implementation/testing evidence → archived Paykar examples. When rules conflict, preserve working IPOS behavior and document the exception.
