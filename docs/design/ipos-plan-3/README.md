# IPOS.Plan 3.0 design evidence

22 October 2026. Isolated Chromium contexts, local optimized production build on port 3115. Test content is separate from demo/user data. Browser/IAB runtime with its required skill was unavailable; screenshots and interaction checks use regular Playwright. Both concepts and final screenshots were inspected with `view_image` in the final QA pass.

## Concepts and fidelity

- [Workspace concept](concept-workspace.png), native 1504×1046; [render at the same size](workspace-concept-size.png).
- [Document/mobile concept](concept-document-mobile.png), native canvas 1536×1024; [document render at that size](document-concept-size.png).
- The concept contains invented content, people, dates and branding. The implementation preserves real source copy, existing IPOS.Plan wordmark, exact MSU seal, original assignee field and practical controls. See the ten-point [fidelity ledger](../../IPOS_PLAN_3.md#design-review-and-fidelity-ledger) for adaptations and corrections.

## Before / after

| State | Before | After |
| --- | --- | --- |
| Workspace 1440 | [before](editor-1440-before.png) | [after](editor-1440-after.png) |
| Mobile 390 | [before](editor-390-before.png) | [after](editor-390-after.png) |
| Task inspector | [before](inspector-1440-before.png) | [after](inspector-1440-after.png) |
| Production brief | [before](brief-1440-before.png) | [after](brief-1440-after.png) |
| Dashboard | [before](dashboard-1440-before.png) | [after](dashboard-1440-after.png) |

Full required-size workspace comparisons are under `responsive/before` and `responsive/after`: 1920, 1440, 1280, 1024, 768, 390 and 320 px. Document mode captures at all seven widths are in `responsive/after/document-*.png`. Heights are 1080, 900, 800, 768, 1024, 844 and 700 px respectively.

Supporting captures: [mobile properties](inspector-320.png), [sharing](share-390.png), [export](export-390.png), [history](history-390.png), [new plan](sparse-320.png), [viewer](viewer-390.png), [empty dashboard](empty-390.png).

## Export and QA evidence

- [Browser audit JSON](results.json): 59 checks, no runtime/console errors or warnings, no horizontal overflow or broken images; viewer refresh HTTP 200.
- [Export validation JSON](exports-validation.json): valid editable OpenXML package, original seal bytes, A4 sizes and watermark; three PDF pages.
- PDF page images: [1](pdf-page-1.png), [2](pdf-page-2.png), [3](pdf-page-3.png). Browser print uses actual A4 pagination. Reading mode is a continuous A4-width surface.
- Unit suite: 41 tests. Production-build Playwright suite: 12 scenarios, including the ten existing workflows and two new workspace/media scenarios.

Full generated DOCX/JSON/PDF and unselected screenshots remain in ignored `.playwright-mcp/ipos-plan-3/after/` in this checkout. No source DOCX or font bytes were changed. Screenshots include isolated QA media, not media added to the application seed.
