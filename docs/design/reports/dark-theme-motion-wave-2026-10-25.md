# IPOS.Plan — Dark theme, motion and wave reveal

Date: 2026-10-25 (Asia/Tashkent). Baseline: `f6b36db985be3810e0e7718d9fe5332c66c4ff71`.
Branch: `feat/dark-theme-motion-wave`.
Checkout: `D:/Workshop/Student Council/Plan Builder Theme`.

## Scope and baseline

Fetched `origin/main` before implementation and again before preparing the PR; both resolved to the baseline above. Created a separate worktree. The existing main, redesign and 3.3 worktrees were preserved; the 3.3 branch retained its two unpublished commits.

Read `AGENTS.md`, the IPOS design playbook, the referenced Paykar methodology and the preceding redesign report. Read the installed Next 16.4.1 guides for client providers, CSS and preventing flash before hydration. Used the frontend testing, React and shadcn guidance. **Browser plugin not available**: all browser evidence uses regular local Playwright with disposable contexts and synthetic documents. No real browser profiles or user documents were modified.

The baseline had no application ThemeProvider, a light-only Toaster and a light-only BlockNoteView. Captured dashboard and editor baselines at all seven widths before editing. The centered library, typography, official MSU emblem and document geometry were retained.

| Keep | Refine | Remove |
| --- | --- | --- |
| MSU/IPOS identity, Montserrat headings, Inter UI, centered library | Semantic surface, text, field and status tokens | Hard-coded white application surfaces |
| Local documents, autosave, immutable snapshots and portable files | Accessible theme choice and matching portals/toasts | Forced light toast/editor themes |
| White document presentation and A4 output | Small motion on actual state changes | Animation on hydration, system changes or document typing |

## Theme and visual decisions

`AppProviders` configures the installed next-themes package with `attribute="class"`, `defaultTheme="system"`, `enableSystem` and storage key `ipos-plan-theme`. Its early script applies the preference before hydration. Root HTML suppresses the expected theme attribute mismatch only. A test holds hydration JavaScript requests and verifies the dark HTML class, canvas and visible server-rendered heading before releasing those scripts.

One reusable Radix radio menu is available in the dashboard, editor, preview and shared-view headers. Russian labels are «Светлая», «Тёмная» and «Как в системе». The trigger has a stable 44px box; CSS selects its initial icon before hydration. Selection uses native radio-menu semantics and keyboard handling. Mobile chrome keeps the control reachable; the existing body/footer continues to explain local storage and immutable sharing.

Dark values extend the existing semantic tokens, rather than adding selector-by-selector dark patches:

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#f5f6f9` | `#0b1120` |
| Main surface | `#ffffff` | `#151f31` |
| Floating surface | `#ffffff` | `#182339` |
| Foreground | `#17191d` | `#e8edf6` |
| Supporting UI text | `#525b6b` | `#a4b2c7` |
| Accent | `#132fc1` | `#9aacff` |
| Field boundary | `#8d94a1` | `#60718b` |
| Separator | `#dce1e9` | `#35455e` |

The darker institutional hero remains blue; its white creation action stays prominent. Status colors use restrained semantic foreground/surface/border roles. Input boundaries were strengthened after calculation: 3.05:1 on white and 3.16:1 on the dark floating surface. The dark accent has 5.71:1 contrast on the selected surface. The original emblem image bytes are unchanged; a white circular backing preserves its legibility on navy.

Workspace mode uses an adaptive editing surface and a matching BlockNote theme. Document mode, embedded document previews and shared documents deliberately retain white paper with local light tokens and light BlockNote presentation. Chrome and portals remain dark around that paper. The dark token override is screen-only; print explicitly enforces white background, dark text and light color scheme.

No database, portable schema, serializer, typography setting, export implementation, autosave timing or share codec changed. Theme is an application preference and is absent from document JSON and snapshot data.

## Wave candidates and timing

Evaluated two real rendered candidates at 390 and 1440px: a curved/undulating sweep and an organic radial reveal. The sweep was injected by the comparison harness into the same native snapshot animation; it is not shipped as an alternative product setting.

Selected the radial reveal: it has a clearer connection to the actual control position, travels naturally from either header layout and performed better in the recorded desktop comparison. A fixed 64-vertex polygon uses small three- and five-lobed variations, avoiding a mechanical circle. No canvas, video asset, filter or WebGL is shipped.

The production reveal requests **620ms**, with a restrained ease-out. The old snapshot is below the new snapshot and the new root is revealed by clip-path. Pseudo-elements cannot intercept input. The theme menu closes before either snapshot is taken.

The transition callback uses `flushSync` and observes the actual next-themes root class commit. It does not assume `setTheme` changes the DOM synchronously. The observer has a 160ms safety bound; a deferred commit skips the snapshot and lets the ordinary theme update finish. All transition promises are handled. Repeated explicit choices skip the active transition and cancel its animation; completed filled animations are explicitly cancelled too.

There is no wave on hydration, reload, cross-route persistence or automatic system changes. Reduced motion, unsupported View Transitions, hidden documents and choices with the same effective theme take the immediate path. Editor identity is retained. Pointer changes restore input selection direction or the full BlockNote anchor/focus selection, focus and scroll; outside clicks retain their own intended focus target.

Production recordings include before/during/after frames and four WebM videos. These demonstrate a moving reveal; static endpoint screenshots alone are not used as evidence of smoothness. With recording/screenshots enabled, the selected radial candidate took 638ms at 390px and 667ms at 1440px; maximum sampled frame gaps were 16.8ms and 33.4ms respectively. The desktop sweep reached a 50ms gap. A separate production run without capture overhead measured four light/dark transitions at 639–650ms, 40 sampled frames each, with maximum gaps of 16.8ms. These are local headless results, not a physical low-power-device guarantee.

## Shared motion system

Added **Motion 14.6.0** (`motion/react`) as the only direct dependency change; npm installed four packages and reported zero vulnerabilities. Shared timing/easing presets live in `src/lib/motion.ts`; `MotionConfig` respects the user's reduced-motion setting and CSS has matching reduced-motion overrides.

- Hero: 320ms, 4px reveal after hydration, with the real primary action present immediately. No hydration-dependent initial style mismatch.
- Statistics: real values are always rendered; only a subsequent genuine value change gets a brief emphasis.
- Rows: stable plan IDs, modest enter/exit/position changes, 1px hover movement and actual progress updates. Initial progress is never animated from a fabricated zero.
- Search: each query owns its presence boundary. Result replacement is immediate with a restrained 85%-to-100% opacity response; rapid reset cannot leave invisible, actionable old rows. Unrelated Dexie updates do not replay entry animations.
- Editor: isolated outline/inspector entry and exit. Exiting desktop panels leave the grid immediately, become inert and fade away; the document itself has no layout animation. Inspector close restores focus to its toolbar control. Radix drawers animate both directions while retaining focus, Escape and resize behavior.
- Save/status/mode controls: truthful visible status feedback, semantic task-status color transitions and native selected-state styling. No editor, character, block, caret or document body is keyed for animation.
- Menus/dialogs/popovers: short state-based feedback, native Radix presence/focus handling, correctly themed Sonner and small real-button press feedback.

## Validation results

All application checks below use the optimized local production build at `http://127.0.0.1:3105`, except the explicitly identified baseline/development investigations.

| Check | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test` | PASS — 94 tests, 12 files |
| `npm run build` | PASS — Next 16.4.1 optimized build |
| `npm run test:e2e` | PASS — 35 tests against the optimized production build (3.1 minutes) |
| Rendered light/dark matrix | PASS — 275 assertions per theme, 550 total; 140 PNGs per theme |
| Console/runtime/hydration | Zero errors and warnings in both production matrix runs |
| Rendered text/placeholder contrast | PASS — 267 samples per theme, 534 total; no AA failures in sampled default text |
| Supplemental portal/system checks | PASS — 20 checks, including 14 system-theme/viewport combinations; zero errors |
| Independent full workflow smoke | PASS — 17 checks, including real JSON/DOCX downloads and immutable second-tab viewing |
| Firefox 157 | PASS — fallback, persistence, edit/autosave/reload, white Document, mobile drawer/Escape/overflow; zero errors |
| Print comparison | PASS — four A4 pages in both themes; identical page geometry, content streams and extracted text; print PNG bytes identical |
| Portable/export equivalence | PASS — JSON text and downloaded DOCX bytes identical between themes; downloaded archives pass CRC and XML parsing |
| `git diff --check` | PASS |

Nine theme/motion e2e cases cover pre-hydration theme application; persistence and system changes; real snapshot commit timing and rapid changes; reduced motion; unsupported API fallback; unsaved input/caret/scroll/editor identity; dark portals/toasts/JSON/print; backward BlockNote selection and modal drafts; desktop panel exits/inertness/focus/editor identity. Existing drawer geometry assertions now wait for the resting geometry instead of measuring the middle of a deliberate animation. Assertion thresholds and test timeouts were not relaxed.

### Browser matrix

| Engine / condition | Widths | Coverage |
| --- | --- | --- |
| Chromium, explicit light and dark | 320, 390, 768, 1024, 1366, 1440, 1920 | Populated/empty/search library, long names, import/errors, delete, backup restore, editor modes, panels, focus, export/history/share and reader |
| Chromium, system preference | All seven widths | Automatic light/dark changes, no horizontal overflow |
| Chromium, reduced motion | All seven widths in primary matrix; dedicated 320px menu/dialog captures | Immediate theme path, no travelling motion, keyboard/drawer/dialog regression coverage |
| Chromium, normal motion | 390, 1440; complete interaction suite at configured desktop size | Wave candidates/video/frames, rapid choices, editor selection and panel exit checks |
| Firefox 157 | 390, 1440 | Forced unsupported-wave fallback plus storage/editor/document/drawer smoke |

### Evidence

Artifacts and capture harnesses are outside Git. The root is `C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/`; scripts are in the matching `C:/Users/ahmad/.codex/tmp/ipos-dark-theme-2026-10-25/` folder. Each primary screenshot state is available at every width listed above. Representative pairs:

| Surface | Light / before | Dark / after |
| --- | --- | --- |
| Baseline dashboard | [Before, 1440](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/before/dashboard-1440.png>) | [Dark, 1440](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-dark/dashboard-1440.png>) |
| Final dashboard | [Light](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-light/dashboard-1440.png>) | [Dark](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-dark/dashboard-1440.png>) |
| Empty phone | [Light](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-light/empty-320.png>) | [Dark](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-dark/empty-320.png>) |
| Workspace | [Light](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-light/workspace-1440.png>) | [Dark](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-dark/workspace-1440.png>) |
| White Document | [Light chrome](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-light/document-1440.png>) | [Dark chrome](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-dark/document-1440.png>) |
| Calendar / selected task | [Light](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/secondary/light-calendar-1440.png>) | [Dark phone](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/secondary/dark-calendar-320.png>) |
| BlockNote menu | [Light](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/secondary/light-blocknote-menu.png>) | [Dark](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/secondary/dark-blocknote-menu.png>) |
| Import | [Light](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-light/import-390.png>) | [Dark](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-dark/import-390.png>) |
| Export | [Light](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-light/export-1440.png>) | [Dark](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-dark/export-1440.png>) |
| History / backup | [Light history](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-light/history-1440.png>) | [Dark restore](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-dark/restore-1440.png>) |
| Share phone | [Light](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-light/share-390.png>) | [Dark](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-dark/share-390.png>) |
| Read-only snapshot | [Light](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-light/viewer-1440.png>) | [Dark](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-dark/viewer-1440.png>) |
| Print / A4 | [Light](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-light/print-1440.png>) | [Dark](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/production-dark/print-1440.png>) |
| Reduced-motion phone control | [Light](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/secondary/light-theme-menu-320-reduced.png>) | [Dark](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/secondary/dark-theme-menu-320-reduced.png>) |

Wave evidence: [radial during](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/waves-final/radial-1440-frame-0.png>), [radial after](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/waves-final/radial-1440-after.png>), [sweep during](<C:/Users/ahmad/.codex/artifacts/ipos-dark-theme-2026-10-25/waves-final/sweep-390-frame-0.png>). Video files and timing events are retained in `waves-final/`, with exact snapshot theme/trigger/keyframe data in `comparison.json`. Non-recording timing samples are in `wave-performance.json`.

Machine-readable evidence: `production-light/audit.json`, `production-dark/audit.json`, `contrast-light.json`, `contrast-dark.json`, `secondary/results.json`, `firefox/results.json`, `smoke/smoke.json`, `exports/results.json`, `docx-validation.json`, `print-comparison.json`.

## Issues found and resolved

1. **Observed hydration mismatch:** reduced-motion-dependent initial hero props differed between server and client. Initial render is now stable; the optional reveal starts after hydration. The final pre-hydration and console tests pass.
2. **Observed retained animation:** a finished native animation with `fill: both` remained registered. Explicit completion and interruption cleanup now removes it; rapid-toggle tests verify no remaining snapshot animations.
3. **Observed selection-direction loss:** cloning a DOM Range preserved the selected text but reversed a backward selection. Restoration now keeps anchor/focus nodes and offsets, plus textarea direction. Both selection tests pass.
4. **Observed rapid-filter retention:** an exit interrupted by rapid reset could retain an invisible plan row. A query-scoped presence boundary prevents stale result actions. Existing five-width search regressions pass.
5. **Observed test timing:** drawer assertions sampled an entering drawer outside its final edge. They now await the original resting geometry, without changing its expected dimensions.
6. **Harness corrections:** Playwright `locator.click()` scrolled a sticky child to its flow origin before the scroll-preservation test. Actual pointer coordinates now test the interaction without that preparatory scroll. Supplemental slash-menu capture uses real keyboard typing, matching the application's keyboard-triggered menu. Concurrent Playwright runners briefly collided in their shared artifact directory; the complete final suite runs alone.
7. **Observed responsive panel handoff:** keeping a desktop form during its exit briefly duplicated its fields when resizing into a mobile drawer. Breakpoint changes now replace the panel presence boundary immediately; explicit desktop closes retain their short inert exit animation. The editor is outside both boundaries.

Development-only Motion warnings explain the intentionally emulated reduced-motion setting. The final optimized-build matrix has no such warnings. No unresolved application error is known in the tested matrix.

## Files changed and review boundaries

- `package.json`, `package-lock.json`: Motion dependency only.
- `src/app/layout.tsx`: providers, hydration-safe HTML and resolved toaster.
- `src/app/globals.css`: semantic light/dark tokens, theme controls, native snapshot rules and reduced motion.
- `src/app/surfaces.css`, `dashboard-hero.css`, `workspace.css`, `document.css`, `print.css`: token consumers, scoped microinteractions, adaptive workspace and white output.
- `src/components/theme/app-providers.tsx`, `theme-control.tsx`: provider and reusable accessible selector.
- `src/lib/motion.ts`, `theme-wave.ts`: shared values and bounded native transition coordination.
- `src/components/ui/changing-number.tsx`, `sonner.tsx`, `button.tsx`, `badge.tsx`: real-number feedback, effective toast theme and semantic destructive foreground.
- `src/features/plans/dashboard.tsx`, `editor-screen.tsx`, `src/features/sharing/viewer-screen.tsx`: theme access and focused motion integration.
- `src/components/editor/plan-renderer.tsx`: matching BlockNote presentation and isolated panel motion/focus.
- `tests/e2e/theme-motion.spec.ts`: nine new regression cases.
- `tests/e2e/editor-layout.spec.ts`, `redesign.spec.ts`: wait for resting drawer geometry.
- This report.

Physical iOS/Android hardware, Safari/WebKit, screen readers, actual Microsoft Word rendering and low-power GPU behavior remain **NOT TESTED**. Contrast sampling covers default visible application text and placeholders; it cannot guarantee arbitrary user-selected document colors or third-party assets. Screenshots/videos are local evidence, not uploaded public assets.

The handoff is a focused feature-branch PR. **Do not merge main or deploy production without separate user authorization.** Existing native Git integration may create a branch preview; production settings, environment variables and deployment protection were not changed.

## Primary implementation references

- [next-themes provider, early script and hydration guidance](https://github.com/pacocoursey/next-themes).
- [MotionConfig and reduced motion](https://motion.dev/docs/react-motion-config).
- [AnimatePresence, stable children and popLayout](https://motion.dev/docs/react-animate-presence).
- [Same-document View Transition lifecycle and snapshots](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using).
- [Radix dropdown menu composition](https://ui.shadcn.com/docs/components/radix/dropdown-menu).
- Installed Next guides: `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`, `01-app/01-getting-started/05-server-and-client-components.md` and `11-css.md`.
