# IPOS.Plan · Reels editor visual reference (16 November 2026)

## Input and authority

- User-approved generated reference image: **1672 × 941 px**, presented in the conversation on 16 November 2026 (not a production screenshot).
- Product rules: `PRODUCT.md`, `DESIGN.md`, `docs/design/IPOS_DESIGN_PLAYBOOK.md`.
- Design workflow: Impeccable **Operate** + comp-led layout and polish guidance. The full binary-driven Impeccable phase runner was unavailable; the composition was manually decomposed and implemented in code, then tested with project CI.
- This implementation uses existing editor/document data and official in-repository branding. It does not make a preview image or seed user drafts.

## Reference decomposition

| Region | Approximate comp bounds (px) | Real component | Implementation |
| --- | --- | --- | --- |
| **01. Header** | x=0–1672, y=0–97 | `EditorScreen`, `ThemeControl`, `PlanActionsMenu` | `src/app/editor-reference-header.css` |
| **02. Structure** | x=18–344, y=120–899 | `PlanOutline` inside `WorkspacePanel` | `src/app/editor-reference-outline.css` |
| **03. Document** | x=356–1252, y=120–899 | `PlanCover`, `TaskCard` in BlockNote / `plan-paper` | `src/app/editor-reference-document.css` |
| **04. Properties** | x=1268–1652, y=120–899 | `BlockInspector` inside `WorkspacePanel` | `src/app/editor-reference-inspector.css` |

Coordinates indicate visual relationships, **not** fixed-position pixel CSS. Preserve responsive behavior and the actual user's editable content.

### Region 01 — work toolbar

- Left: back navigation, authenticated app identity, actual plan name and factual local-save status.
- Center: Workspace / Document selection.
- Right: preview, overflow actions, share and theme control; mobile keeps the functional grid and existing accessible labels.
- Use real platform components and state. Avoid decorative changes that interfere with keyboard or touch.

### Region 02 — document structure

- A persistent label **«Структура»**, a functioning add-task control, existing structure/tasks tabs and navigation.
- Active task has a light-blue background and a thin primary-color indicator.
- Preserve task search, assignments, hierarchy, block insertion, keyboard access and adjustable desktop width.

### Region 03 — editable Reels plan

- Emphasize actual plan title in blue, secondary editorial context and a short branded rule.
- Use a restrained highlight for the **selected** task (border + secondary surface), numbered square and functional task metadata.
- Keep status **editable** in the brief and task properties; do not derive or invent any deadline.
- Do not change portable task/block schemas, BlockNote children, default plan content, Document mode, print CSS, DOCX, share links or local save behavior.

### Region 04 — contextual inspector

- Show **«Свойства задачи»** with actual selected task reference.
- Native controls/labels for title, status, priority, assignees, due date and description continue to edit the real task.
- At narrow viewports, use the already-existing drawer rather than squeezing three columns into a phone.

## Breakpoints and manual acceptance

- At **1672/1440 px**, verify 3 columns with a readable central document; opening the first task may reveal properties.
- At **1200–1439 px**, opening a second panel is optional; verify adequate document width and panel close controls.
- At **768/390/320 px**, preserve the working document and accessible drawers. No horizontal scroll, clipped controls, or disappearing share/save.
- Test both themes, keyboard focus, long Russian titles and assignees, status editing, local persistence on reload, focus mode and reduced motion.
- Document/print remains A4 and obeys the established `print.css` rules.

## Evidence and caveats

- The design follows a **concept illustration**, not a measured production screenshot.
- The reference contains example tasks from a real brief: **«Один и тот же студент»** and **«Первый вышел с экзамена»**. They appear only as sample data in the automated test. No plan is added to another person's library.
- The browser runner is validated through GitHub Actions; automated geometry checks cannot establish pixel-perfect visual equivalence. Manual review of the Vercel Preview is a separate acceptance step.
