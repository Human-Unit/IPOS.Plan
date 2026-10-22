# IPOS.Plan 3.0 — workspace architecture and delivery

## Milestone A: audit and foundation

Baseline: current `origin/main` at `49fe393`, 22 October 2026. Dedicated branch `feat/ipos-plan-3-workspace`; the previous branch and safety stashes are preserved. `npm ci`, baseline build and all 32 baseline unit tests pass. Browser baseline captures cover all seven requested sizes using an isolated five-task plan, including nested original children. No user browser data is touched. Before screenshots are in `.playwright-mcp/ipos-plan-3/before/`.

Root causes:

- Task ownership exists only as a sibling scan in `taskCompanions`. The task's native children and following siblings are different source structures, but the UI does not express that distinction.
- `presentationStyle` paints joined borders around separate ProseMirror nodes. Layout boundaries are inferred again in CSS and can disagree with editing boundaries.
- Media is rendered inside `TaskCard` while its actual source block is hidden. References, requirements and metadata are separated by a rigid two-column layout.
- A4 constrains authoring even on large screens. Workspace and finished document share a layout despite different needs.
- URL-only images prevent clipboard/file workflows. Share size limits make unrestricted inline images unsafe.

Architecture decision: project canonical schema-v1 blocks into editor-only `brief` containers. An internal child group retains original task children; legacy sibling companions become children of the editor container. Consecutive leaf images can use an editor-only media strip. A deterministic serializer removes every internal wrapper before autosave, JSON, revisions, sharing or DOCX. The original task ID is the container ID. One BlockNote editor retains native rich text, selection, undo and task drag behavior. No ProseMirror DOM mutation and no per-ID layout rules are required. Per-block typography remains an independent presentation concern.

This is not a stored schema migration: legacy plans are projected when opened and serialize to the same IDs/order/children. Mode switching changes presentation without replacing editor content. The adapter has round-trip, nested-child, reorder and duplicate coverage.

Plan:

1. **A** — record audit, projection adapter and lossless boundary tests; preserve working baseline.
2. **B** — use native containers, fluid workspace/document modes, direct task editing, quick status, collapse, duplicate, add requirements/references and whole-brief ordering.
3. **C** — bounded portable raster images from file/paste/drop; URL replacement/caption; document/viewer/export compatibility.
4. **D** — align dashboard and dialogs, responsive/accessibility review, full checks, evidence, feature push, PR and Vercel Preview. No merge or production deployment.

Design foundation: verified Figma palette `836q18CXC7jTT4FRrRQvUM`, node `1:342`: blue `#132FC1`; existing secondary blue/red/neutral tokens retained. Inter UI, Montserrat headings, native MSU seal unchanged, no proprietary font files. White brief surfaces and quiet rules on `#F7F7F5`; compact metadata remains adjacent to the description. Media follows text at its natural aspect; no forced right image column. Detailed concept/fidelity and final QA evidence will be recorded after implementation.
