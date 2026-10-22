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

Design foundation: verified Figma palette `836q18CXC7jTT4FRrRQvUM`, node `1:342`: blue `#132FC1`; existing secondary blue/red/neutral tokens retained. Inter UI, Montserrat headings, native MSU seal unchanged, no proprietary font files. White brief surfaces and quiet rules on `#F7F7F5`; compact metadata remains adjacent to the description. Media follows text at its natural aspect; no forced right image column. Concept/fidelity and final QA evidence are recorded below.

## Delivered milestones B–D

**B — Native production briefs.** `brief-document.ts` is the single ownership adapter for the editor and outline. `brief`, `briefChildren` and `mediaStrip` exist only inside BlockNote. Original task children retain their boundary; following legacy companions become native editor children. The serializer restores schema-v1 blocks, original IDs and original nesting. `serializeWithSource` removes implicit editor defaults from untouched source blocks. No internal nodes enter IndexedDB, exports, revisions or snapshots. A seven-test adapter suite covers exact round trips, nested content, source defaults, duplication and ordering.

Workspace defaults to a fluid white surface, maximum 1120 px, with a compact cover and numbered open briefs. The existing resizable/collapsible panels remain; both dock at 1440 px, with bounded widths that preserve the editor. Smaller screens use accessible modal panels. Document mode uses the same mounted editor and canonical data, read-only A4 styling, institutional cover and optional watermark. Preview is a shortcut to the same reading presentation. Mode changes do not replace editor content or create history entries.

Titles and descriptions edit directly. Status changes in place. Each task can collapse, duplicate with all descendants and typography, move as a whole brief, delete, open properties, or add a requirement/reference/image/file. Requirement insertion moves the native text cursor to the new block. Original BlockNote rich text, slash menu, clipboard and block handles remain. Popups use BlockNote's supported body portal so the inspector does not intercept them. Ctrl/Cmd+Z and redo outside text fields reach the canonical editor; native text-field undo remains native. Typography retained in the existing in-memory undo cache survives delete/undo.

**C — Portable media and exports.** File selection, clipboard image paste, desktop file drop, replacement, caption editing and zoom/download work locally. Raster inputs PNG/JPEG/WebP are decoded and re-encoded to WebP, bounded to 1280 px and 64 KiB per image. Inputs above 8 MiB or 25 megapixels are rejected. The UI explicitly describes this as a reduced copy and asks users to retain originals. No temporary Blob URL is persisted. External HTTP(S) image URLs still work.

Consecutive images form a native media group, with independent natural aspect ratios and responsive stacking; text stays before media. The media inspector shows a preview, source, caption, replacement and removal. The existing schema-v1 image URL field additionally accepts validated, magic-byte-checked PNG/JPEG/WebP data URLs up to 64 KiB. SVG/HTML/other data URLs and `blob:` remain rejected. The entire candidate plan is checked against portable limits before adding media. Async preparation uses the latest editor content and does not overwrite intervening edits.

JSON remains limited to 1 MiB; shared tokens remain limited to 180,000 characters, with the existing warning above 8,000 URL characters. Oversized snapshots fail explicitly. Reduced image bytes travel in JSON and accepted snapshots; external URL availability still depends on its host. Existing plans and older shared tokens remain readable. This additive image capability needs the updated client: older clients can reject files containing new inline assets. There is no database/table migration and no change to task or block identities.

DOCX now traverses original nested blocks, embeds validated inline rasters, and converts WebP to PNG for Word. It retains editable OpenXML text, exact original seal bytes, watermark and A4 dimensions. Print includes collapsed content and static task fields while omitting controls. Document mode is a continuous A4-width reading surface; actual repeated page margins and pagination are applied by browser print.

**D — Supporting screens.** Dashboard rows show actual leading assignment titles and remaining count; empty plans invite a first brief or ordinary text. Import explains legacy 2026 compatibility and size validation. Export and sharing explain inline-image portability and external-host limits. History, restoration, import preview and immutable viewer reuse the updated renderer and dialog system. No fake members, cloud status, team avatars, authentication or backend were introduced. Demo/user content and existing fonts are preserved.

## Design review and fidelity ledger

Concepts were generated before UI implementation and compared with final Chromium screenshots using `view_image` in the same QA pass. Concepts are references for composition; source content and actual supported data fields remain authoritative. See [design evidence](design/ipos-plan-3/README.md) for before/after images, concepts and machine-readable QA results. Native concept canvas sizes 1504×1046 and 1536×1024 were captured as well as the seven required sizes.

| Comparison | Concept evidence | Final decision / correction |
| --- | --- | --- |
| Container model | `concept-workspace.png`: open white numbered assignments between navigation and inspector | Native brief nodes establish the boundary; quiet rules replace CSS-painted sibling cards. No structural per-ID layout CSS. |
| Authoring / reading | Both concepts: blue Workspace/Document toggle and a distinct A4 reader | Both modes use the same mounted document. Workspace is fluid; Document uses a bounded A4 surface. |
| Header and copy | Concept uses invented 2025 deadlines, shortened names and a 3.0 logo | Source titles, type prefixes, real 2026 dates and existing IPOS.Plan wordmark are retained. No imported content is rewritten to fit the mockup. |
| Identity and assets | State concept enlarges the seal and invents institutional copy | Exact existing local seal stays small beside the actual cover. Existing approved IPOS watermark remains optional. No generated logo/avatars ship. |
| Typography and palette | Blue #132FC1, white briefs, neutral outer workspace, strong headings | Inter controls at explicit 11–13 px, Montserrat brief titles at 23 px, document body 16 px/1.65; existing per-block font overrides remain. No gradients/glass. |
| Description and metadata | Concept places deadline/people/priority directly beneath description | Real task string assignees remain adjacent. No new people entity or fabricated avatar. Long/missing descriptions stack correctly. |
| Media composition | Concept has a photo rail after requirements | Real landscape/portrait QA assets use natural aspect ratios, grid at useful widths and a single column on narrow screens. No awkward right-hand image column. |
| Actions and icons | Plus, paperclip, disclosure and properties controls | Existing Lucide family and Radix primitives; task actions sit with metadata, before native editable children, avoiding DOM reparenting. Every advertised command is exercised. |
| Screen/print states | Final visual review caught duplicate status and internal indentation guides | Print-only status now stays hidden on screen; internal brief/gallery guides are removed while real nested list indentation remains. Regression checks include collapsed content in print. |
| Mobile/tablet | State concept stacks controls and document content | Three compact toolbar rows fit 320 px; title and description wrap without clipping, metadata stacks, properties use a bottom sheet. Tablet identity now retains its intrinsic width so the new mode switch cannot overlap the logo at 768 px. |

Above-the-fold copy audit: retained IPOS.Plan, Рабочий стол, Документ, preview/focus/share, actual plan title, task type/title/status and metadata. Intentional differences from generated copy are the real source title/date/roles, existing preview label, and functional outline/properties controls. Generated fabricated names, avatars and university claims were not adopted. UI and document chrome were inspected separately; no remaining material fidelity defect was found within these documented adaptations.

## Verification — 22 October 2026

Windows, Node.js 24, Chromium. Browser/IAB runtime with its required skill was unavailable, so regular Playwright was used with isolated browser storage. Final tests run against `next build` + `next start` on port 3115, separate from the user's usual 3105 server. No user browser database was read or modified.

| Check | Result |
| --- | --- |
| `npm ci` | PASS, existing toolchain audit advisories retained; no forced dependency update |
| `npm run lint` | PASS, no warnings |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 41 tests / 7 files |
| `npm run build` | PASS, all routes generated |
| `npm run test:e2e -- --config .playwright-mcp/v3.config.ts` | PASS, 12 scenarios against production build; base URL override only |
| Separate screenshot/browser audit | PASS, 59 assertions, 0 console errors and warnings |
| Responsive sizes | 1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 320×700 |
| JSON/mode round trip | Canonical blocks/tasks/fonts unchanged after mode switching; exact original nesting retained |
| Existing 2026 schema-v1 format | Imported into a fresh browser, previewed, edited, exported and reloaded |
| Task controls | Direct title/status, collapse, duplicate, whole-brief reorder, keyboard undo/redo, reload |
| Media | File upload, actual clipboard paste, DataTransfer file drop, replacement, gallery, zoom, reload, JSON/share bytes |
| Storage/regressions | Autosave, delete/undo, rich-text clipboard, stale-tab conflict with unsaved-copy export, revision restoration |
| Immutable viewer | New tab, old snapshot after source edit, no editable controls, direct `/view` refresh HTTP 200 |
| DOCX | Valid ZIP, 8 XML parts, 4 media parts, 54 editable text runs, exact seal, A4 and watermark; nested text and inline bytes tested |
| PDF | Three A4 pages visually inspected; 178 mm print body, repeated 16 mm margins, no editor controls |

The twelve scenarios retain the ten prior regression workflows. Assertions about the old painted-card implementation were replaced with native-container/width/aspect assertions; data, persistence, conflict, export, ID and clipboard requirements remain. The two added scenarios cover 3.0 modes/brief commands and portable media. The screenshot fixture has five assignments (two Reels, carousel, design, photography), varied statuses/roles, long/short/missing descriptions, a very long title, nested requirements, mixed fonts and real landscape/portrait references. Test media is intercepted only in isolated QA, never added to seed data. The supplied DOCX is not modified.

## Boundaries and next milestones

- File media is a small portable rendition, not original asset storage. Compression may be substantial. Keep source files separately. Large media libraries need a separately designed Blob store/package or authorized cloud architecture.
- Assignees remain free text; content type is a display hint derived from an existing title prefix. Neither introduces a new schema field or pretends to provide member management.
- Task-title/description field undo uses the browser input history. Structural and rich-text undo use BlockNote. There is no new cross-field transactional task history.
- Legacy source sibling boundaries remain defined by the next task/divider on the same level; the adapter makes the editing representation explicit and reversible. A future stored ownership model would need versioned migration and legacy-link coverage.
- Reading mode shows continuous A4 width, not live page splitting. PDF uses the browser's real paginator; Word/LibreOffice visual parity and advanced page controls remain future validation.
- Mobile results are Chromium viewport emulation, not physical-device/Safari/Firefox QA. Clipboard APIs require a secure origin and browser permissions.
- Existing local-storage lifetime, 700 ms debounce, share URL length and external-source constraints still apply. No collaboration, cloud upload, environment variables, analytics, backend or DB changes.
- Next useful milestones: physical-device/cross-browser QA; larger offline asset packaging with explicit portability; optional structured people/type fields with migration; print pagination controls and office-suite visual QA. None is advertised as implemented.

Primary API references: [BlockNote custom blocks](https://www.blocknotejs.org/docs/features/custom-schemas/custom-blocks), [editor manipulation](https://www.blocknotejs.org/docs/reference/editor/manipulating-content). Exact APIs were checked against installed BlockNote 0.55 source; Next.js CSS guidance against installed package documentation. Review uses existing Radix/shadcn primitives and local brand assets.

Release scope: feature branch only, PR targeting `main`, Vercel Preview. No merge and no production deployment.
