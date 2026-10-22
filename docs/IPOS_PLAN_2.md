# IPOS.Plan 2.0 — design and validation report

> Historical 2.0 report. Current workspace architecture, media capabilities and QA: [IPOS_PLAN_3.md](IPOS_PLAN_3.md).

## Audit, before implementation

Baseline: `d5d87e1` plus the existing uncommitted brand polish, preserved on `design/ipos-plan-2`. Main is unchanged. Screenshots use a fresh Chromium context and a realistic four-task fixture, never the user's browser database. The fixture covers two Reels, a carousel, design work, different statuses, long descriptions, multiple responsible roles, image/reference URLs, requirements, callouts and mixed fonts. It is QA content, not an institutional claim or production seed.

The existing foundation is Next.js App Router / React / BlockNote, Radix-based shadcn controls, Dexie and Zod. `PlanRenderer` is dynamically loaded once and reused by editing, preview, import, revisions and immutable sharing. Tasks remain normalized entities referenced only by `taskId`. Autosave serializes writes after 700 ms and repository transactions protect against stale-tab overwrites. JSON and compressed snapshots share the same validation. DOCX is generated locally as OpenXML/ZIP. These boundaries remain intact.

Reviewed: README, ARCHITECTURE, PLAN_SCHEMA, DOCX export UI and implementation, BlockNote schema and custom blocks, dashboard, renderer, inspector, outline, source grouping, persistence, revisions, JSON import/export, snapshot codec, viewer, all stylesheets and existing tests. Installed Next CSS/client component documentation and existing Radix component APIs inform the implementation.

### Baseline findings

- Five overlapping global stylesheet layers contain about 3,000 lines. They disagree about paper width, panel columns, title sizing, outline rows, and reference layout.
- At 1440 px, outline task titles disappear because old selectors conflict with the newer nested structure.
- The selected inspector is outside the effective two-column grid. It does not form a reliable third workspace region.
- The large centered Student Council watermark interferes with paragraph reading.
- Cover and first imported heading repeat the same plan identity. Task headings use a separate document style that differs from the rest of the interface.
- Deadline sentences are visually louder than task titles. Reference symbols and text break onto separate lines; labels are inconsistent.
- Dashboard rows use generic large card framing and small metadata. The footer exposes the internal P0 milestone.
- The toolbar, dialogs and inspector lack one consistent control scale. Mobile controls and document presentation inherit desktop overrides.
- The baseline browser showed no horizontal overflow or runtime errors in the seven requested viewports, but the layout defects above remain visible.
- Baseline unit checks: 31 passed, 1 failed. The existing grouping test expects text to remain in a task's presentation section; the pulled implementation stops at paragraphs. The redesign will restore coherent presentation grouping without moving stored blocks or hiding media with children.

Baseline screenshots: `.playwright-mcp/ipos-plan-2/before/` (1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 320×700). Desktop dashboard, editor, selected task, preview, viewer, import and share are also captured.

## Design foundation

Direction: an editorial production desk. Compact navigation and contextual properties surround a dominant white A4 document. Open numbered task sections replace boxed task cards. References remain useful even when a platform supplies no image preview. The dashboard uses document rows and actual local edit metadata, without fabricated metrics or cloud claims.

Direct Figma inspection: file `836q18CXC7jTT4FRrRQvUM`, institutional lockup `81:76`, emblem `107:2`, blue palette `1:342`, typography `1:629`. The brandbook confirms blue `#132FC1`, secondary `#3A53D1`, angular forms and an Inter bold typography treatment (36 px, 1.32 line height, −2% tracking). Existing red `#C11316` is reserved for deadlines/destructive actions. Interface typography uses Inter; Montserrat provides the editorial heading voice. BL Melody/NT Somin files are not copied or redistributed.

The existing MSU seal remains the exact local PNG on covers and application identity. Existing council SVG bytes and DOCX branding remain unchanged. No image-generated logo or screen screenshot is shipped as UI.

| Group         | Decision                                                                           |
| ------------- | ---------------------------------------------------------------------------------- |
| Colors        | Blue `#132FC1`, text `#17191D`, workspace `#F7F7F5`, white surfaces, red `#C11316` |
| Typography    | UI 13–14 px; document body 16–17 px; title 32 px; task 23 px; metadata 13 px       |
| Spacing       | 4/8/12/16/20/24/32/40/48 px scale                                                  |
| Geometry      | 4 px controls, 6 px dialogs, thin neutral rules, minimal page elevation            |
| Document      | 210×297 mm when space permits; continuous height; responsive fit on narrow screens |
| Motion        | 160 ms controls/panels; reduced-motion support; no animated document surfaces      |
| Desktop       | Resizable outline + A4 + contextual inspector; inspector collapses fully           |
| Laptop/tablet | Document retains space; panels open as overlays                                    |
| Mobile        | Compact toolbar, accessible outline, bottom-sheet inspector, stacked images        |

Interaction research: [Notion block model](https://www.notion.com/help/category/write-edit-and-customize), [Linear display options](https://linear.app/docs/display-options), [Craft focus mode](https://www.craft.do/s/fegziZPWTrBfn0). Applied patterns are stable block identity, selective property visibility, clear navigation hierarchy, and deliberate reduction of chrome in focus mode. No copied product layout or additional feature model is introduced.

## Implementation and final QA

Completed 20 October 2026. The dashboard, editor, focus mode, outline, contextual inspector, task briefs, references/images, import/export, share, history/restore/delete, preview and shared viewer now share one visual system.

### Workspace and document

- The dashboard uses compact document rows with the actual MSU seal, edit time, task counts, completion progress, and open/duplicate/delete actions. The latest plan receives a restrained blue rule. Empty and invalid-import states use the same language and control scale.
- The document remains the main surface. At 1440 px and above the outline (208 px default) and selected inspector (280 px default) can coexist; their widths remain adjustable and persisted locally. Both panels close completely. Laptop/tablet panels are overlays; the mobile inspector is a scrollable bottom sheet. Focus mode removes both panels and their control strip.
- Numbered task sections use open typography, quiet semantic status markers, readable descriptions, full-width reference rows, concise deadline/assignee metadata, and adjacent portrait images on wider screens. Images stack below text on phones and are capped to avoid excessive enlargement. HTTP image failures have a usable original-link fallback; social links use platform/type icons and their real domains, without scraping.
- Companion headings, paragraphs and lists remain native BlockNote blocks until the next task/divider at the same level. Original IDs/order/children are preserved. Only childless media is presented inside the brief; no ProseMirror DOM is moved. The duplicate first title is visually collapsed, remains in JSON, and is explicitly editable through the outline. Native selection/clipboard/undo are retained.
- The inspector groups existing task, reference, image, document and typography properties. Alignment updates existing BlockNote properties. External font registration remains available under an advanced disclosure. Montserrat, Inter, Roboto, Georgia, Merriweather and existing registered font choices remain supported; NT Somin requires a font available to the recipient, as before.
- All document views use the shared renderer and cover, including import and revision previews. A4 is 210×297 mm on screen when space allows and fits narrow viewports. Browser printing uses physical A4 with repeated 16 mm margins, removes chrome, and keeps task brief content together where it fits.

### CSS ownership

| File                    | Responsibility                                                     |
| ----------------------- | ------------------------------------------------------------------ |
| `src/app/globals.css`   | Tokens, type scale, base controls, focus and reduced motion        |
| `src/app/surfaces.css`  | Dashboard, menus, dialogs and secondary states                     |
| `src/app/workspace.css` | Toolbar, resizable columns, outline, inspector and drawers         |
| `src/app/document.css`  | One A4 document, briefs, references, media and document typography |
| `src/app/print.css`     | A4 page size/margins, pagination and print-only visibility         |

Removed obsolete `editor-polish.css`, `typography-layout.css`, `watermark.css` and `a4-workspace.css`. Styles no longer compete through successive redesign layers. Official council SVG exports retain their original byte hashes; `.gitattributes` prevents checkout line-ending conversion for those assets. The MSU PNG, DOCX branding and watermark implementation are unchanged.

### Screenshots and concept comparison

| Screen           | Before                                                      | After                                                                                                         |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Dashboard        | [Before](design/ipos-plan-2/dashboard-before.png)           | [After](design/ipos-plan-2/dashboard-after.png)                                                               |
| Editor           | [Before](design/ipos-plan-2/editor-before.png)              | [After](design/ipos-plan-2/editor-after.png)                                                                  |
| Production brief | [Before, in document](design/ipos-plan-2/editor-before.png) | [Brief close-up](design/ipos-plan-2/brief-after.png)                                                          |
| Inspector        | [Before](design/ipos-plan-2/inspector-1440-before.png)      | [Desktop](design/ipos-plan-2/editor-after.png), [mobile sheet](design/ipos-plan-2/inspector-mobile-after.png) |
| Preview          | [Before](design/ipos-plan-2/preview-1440-before.png)        | [After](design/ipos-plan-2/preview-after.png)                                                                 |
| Mobile           | [Before](design/ipos-plan-2/mobile-before.png)              | [After](design/ipos-plan-2/mobile-after.png)                                                                  |

Also captured: [share](design/ipos-plan-2/share-after.png) and [revision preview](design/ipos-plan-2/history-after.png). All seven requested dashboard/editor viewport pairs are committed under [responsive/before](design/ipos-plan-2/responsive/before) and [responsive/after](design/ipos-plan-2/responsive/after). Final captures use `npm start`, without a development overlay.

Concept references are retained as design documentation only: [editor](design/ipos-plan-2/concept-editor.png), [dashboard](design/ipos-plan-2/concept-dashboard.png), [mobile](design/ipos-plan-2/concept-mobile.png), [share](design/ipos-plan-2/concept-share.png). They were generated from the brand direction with the existing seal as a fixed reference; no generated seal or screen raster is used in the application. The concepts and final desktop/mobile/dialog captures were inspected together in the final visual pass.

| Concept decision                                    | Final implementation / intentional adaptation                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Editorial desk with blue navigation and open briefs | Preserved; actual A4 dimensions take precedence over illustrative paper proportions                           |
| Large seal in cover                                 | Exact existing seal, 56 px desktop / 40 px mobile, to give more room to the title and content                 |
| Outline, paper, contextual properties               | Preserved; inspector defaults closed until needed and overlays below 1440 px                                  |
| Description beside a reference image                | Preserved; actual portrait extracted from the supplied DOCX, without stretching or generated people           |
| Task requirements grouped into the brief            | Native source blocks remain in their original order; visual section rules avoid reparenting or schema changes |
| Dashboard document rows and progress                | Preserved with actual local timestamps/counts, rather than illustrated people or relative times               |
| Share dialog with immutable-copy explanation        | Preserved; real compressed URL and existing copy/open controls                                                |
| Mobile toolbar                                      | Two rows; visible “Просмотр” abbreviation, accessible name “Предпросмотр”, touch controls and bottom sheet    |

Baseline screenshots and the final portrait review share the four-task structure; the baseline image route used an existing landscape brand reference, while final review additionally uses the original 250×400 portrait. Real content and all images are QA context, not new demo seed data. The source DOCX bytes were never changed. One source embedded image has an existing CRC error and was not used.

### Verification

| Check                                  | Result                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                         | PASS, no warnings                                                                                                                                                         |
| `npm run typecheck`                    | PASS                                                                                                                                                                      |
| `npm test`                             | PASS, 32 tests / 5 files                                                                                                                                                  |
| `npm run build`                        | PASS, optimized Next build                                                                                                                                                |
| `npm run test:e2e` against `npm start` | PASS, all 10 scenarios; targeted print/DOCX scenario also rerun after final pagination refinement                                                                         |
| Real-content browser review            | PASS, 52 checks; 0 console errors, 0 warnings, no page errors                                                                                                             |
| Requested viewports                    | PASS: 1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 320×700                                                                                                 |
| Modes                                  | Editor, focus, preview, viewer and dashboard at all seven sizes; sparse documents, empty dashboard and narrow dialogs also checked                                        |
| Layout/assets                          | No horizontal overflow, overlapping docked panels or broken images; source title collapsed; MSU and portrait aspect ratios preserved                                      |
| Persistence                            | Create/edit/reload, autosave, task properties, typography/alignment, stale-tab protection and export of unsaved conflict copy                                             |
| Editing                                | Slash blocks, insertion, outline selection/collapse, native text editing, clipboard, delete/undo, keyboard panel resize and width persistence                             |
| JSON and revisions                     | Paste/file import, validation/error, portable IDs/children/task fields, copy/download, revision preview/restore and backup behavior                                       |
| Snapshots                              | Generate/copy, another tab, immutable content after source edits, readonly controls absent, direct `/view#p=…` refresh HTTP 200                                           |
| DOCX                                   | Downloaded archive CRC and all 8 XML/relationship parts valid; 47 editable text runs, A4 11906×16838 twips, 3 media parts, exact MSU bytes and existing watermark present |
| Browser PDF                            | Three A4 pages (~595×842 pt), visually inspected, no editor chrome, task heading kept with description                                                                    |
| Keyboard/accessibility                 | Named controls, visible focus, dialog Tab trap, Escape, focus return, keyboard menus/resize, readable state labels                                                        |
| Contrast                               | Text 17.60:1, muted text 5.60:1, primary blue 9.53:1, red 6.23:1 on white; colored status text/background pairs at least 5.34:1                                           |
| Reduced motion                         | Verified transition duration drops to 0.01 ms                                                                                                                             |

Machine-readable browser results: [qa-results.json](design/ipos-plan-2/qa-results.json). Full local review captures and downloaded exports: `.playwright-mcp/ipos-plan-2/review/`. The Browser plugin runtime/skill was not available in this session, so the project Playwright Chromium fallback was used. Native file input language follows the browser locale.

The baseline grouping failure is resolved: task section presentation now continues through native paragraphs/lists until the next task/divider, matching the intended source structure. Existing compatibility assertions remain; layout assertions were updated for the new 1440 px desktop breakpoint and physical A4 width. Three additional scenarios cover seven viewport sizes/panels/focus, persisted typography/DOCX/print, and keyboard dialog behavior.

### Preserved boundaries and limitations

`src/lib/schema`, `src/lib/db`, `src/lib/share`, `use-plan.ts`, `repository.ts`, `docx.ts`, `zip.ts`, `package.json` and the lockfile have no changes. Schema version 1, IndexedDB structure/version, 700 ms autosave, transaction/version checks, revisions, share encoding and DOCX generation remain intact. No backend, auth, database service, environment variable or unrelated integration was added.

Verification is desktop Chromium with simulated viewport sizes, not physical iOS/Android, Safari/Firefox, a screen-reader audit or an office-suite rendering check. The DOCX package and editable content were inspected, but Word/LibreOffice was not opened. Remote image and font availability still depends on the source and recipient; proprietary font files are not redistributed. Screen layout is a continuous document, with actual pagination performed by print/Word. Local browser data and the original P0 sharing/storage limits remain unchanged.

### Changed files and publication

- Base styles: `src/app/{globals,layout,surfaces,workspace,document,print}`; four obsolete CSS files removed as listed above.
- Editor: `block-inspector.tsx`, `document-structure.ts`, `media-content.tsx`, `plan-cover.tsx`, `plan-outline.tsx`, `plan-renderer.tsx`; new `plan-actions-menu.tsx` and `plan-inspector.tsx`.
- Identity/task/primitives: `src/components/plan/brand.tsx`, new `official-brand.tsx`, `src/components/task/task-card.tsx`, `src/components/ui/dialog.tsx`; official `public/brand/student-council-{emblem,lockup}.svg` and `.gitattributes`.
- Screens/dialogs: `src/features/plans/{dashboard,editor-screen}.tsx`, `src/features/import/import-dialog.tsx`, `src/features/export/export-dialog.tsx`, `src/features/revisions/history-dialog.tsx`, `src/features/sharing/{share-dialog,viewer-screen}.tsx`.
- Validation: `playwright.config.ts`, `tests/e2e/{actions,brand-polish,redesign,editor-layout,regression,workflow}`, `tests/unit/document-structure.test.ts`.
- Documentation: README, ARCHITECTURE, historical EDITOR_LAYOUT/BRAND_POLISH, this report, concepts and before/after evidence under `docs/design/ipos-plan-2/`.

Feature branch: `design/ipos-plan-2`. Base/main remains `d5d87e11d034d58311da0db2891472065bc4ac0b`. The feature branch is committed and pushed for a Pull Request and Vercel Preview; final commit SHA, PR URL, preview status and final git status are reported with the handoff. No automatic merge or direct production deployment is part of this redesign. Existing safety stashes are retained.
