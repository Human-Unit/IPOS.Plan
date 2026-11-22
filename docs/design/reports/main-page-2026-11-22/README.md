# IPOS.Plan main-page readability redesign

Date: 2026-11-22. Worktree: `Plan Builder Impeccable`. Branch: `design/student-council-impeccable`. Baseline: `f75fe7e`.

Requested outcome: redesign the main page using design-taste-frontend, reduce excess empty space and make small text easier to read.

## Observed baseline and change

| Main-page element | Before | Implemented |
| --- | --- | --- |
| Content width at 1440 | 1120px, 160px side margins | 1264px, 88px equal side margins; header aligns with it |
| Overview | Separate hero and loosely spaced totals | One blue overview with real task totals, compact content-based height |
| Plan titles | 17px desktop / 15px phone | 22px desktop / 20px phone |
| Task summaries | 13px | 16px |
| Dates and task metadata | 12px | 14px |
| Search and filter | Placeholder and accessible name | Visible labels, 16px input text, 48px controls |
| Row actions | 36px desktop | 44px, retained named duplicate/delete controls |
| Names disclosure | 14px title / 12px supporting text | 16px title / 14px supporting text |
| Keyboard entry | Brand first | Skip link to the library, visible on focus |

Preserved the existing Montserrat/Inter pairing, institutional blue palette, MSU emblem, dark/light switch, real data and operational Russian labels. The source Figma brandbook was not reread for this scoped main-page task; the shipped project tokens and assets are the design source.

Implementation is limited to `src/features/plans/dashboard.tsx`, its new scoped `dashboard.css`, and ignoring generated `.taste-skill/` artifacts. Storage, schema, editing logic, backend, owner workspace, publication, serialization and print files are unchanged.

## Skill application and scope

Kind: software, specifically an existing operational planning workspace. Voice: facts only, using the product's existing Russian nouns and action labels. Main action: «Новый план». Palette and type are inherited, with the existing content determining layout; no random marketing deal is claimed.

The request to reduce empty space takes precedence over marketing recipes that require an entire screen for each section. A full-screen hero, promotional footer CTA, stock photographs, mock dashboard, shader or decorative scroll moment would delay access to the real plans. Those were not added. Existing entrance, data transitions, theme wave and reduced-motion behavior remain; row hover and button hover/press provide response to input.

No assumed commercial facts, coined names, testimonials, stand-in photos, client asset slots, contact forms or canonical-domain changes were introduced. Existing local-storage and backup disclosures remain.

## Evidence

Baseline desktop and mobile screenshots were captured with the skill's `shoot.mjs` against the unchanged app, using its bundled demo in isolated Chrome profiles. Final checks target a local **production build**, not the deployed site. No real browser profile or production data was accessed.

The skill's first full consistency run covered 1440, 1024, 820, 768 and 390, with an additional 320 overflow walk. It passed overflow, collisions, tap size, body size, text contrast, reduced motion, labels, control names, heading order and image checks. It returned 147 failures and 41 warnings overall, mostly from marketing-only section heights, container markup and screen-grid rules. Its development-server focus-visible finding identified the Next.js developer portal. Three source-level focus-ring findings refer to pre-existing vendor CSS, not new dashboard controls. Final production checks and full finding files are recorded below after verification completes.

## Verification

Repository checks and browser results are recorded below; this is a local review, not a production deployment.
### Repository and workflow results

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: **100 passed**, 14 files.
- `npm run build`: passed; all existing routes retained. The installed Next.js version emitted an existing security-upgrade reminder and stopped the first invocation; the acknowledged retry completed. Dependencies were not changed for this presentation task.
- Full existing browser suite against the local production build: **35 passed, 3 failed, 2 skipped**. The two admin credential cases are skipped without test credentials; none were added.
- The main-page import/duplicate/delete/empty-state test passed, as did the seven-width dashboard/editor test at **320, 390, 768, 1024, 1366, 1440, 1920**. Search, backups, revisions, editor content, focus/dialog behavior, theme switching and A4/DOCX coverage passed in the existing suite.

The full suite is **not all green**. The remaining failures are:

1. Legacy `system` preference migration: expected the HTML class to be exactly `dark`, received `system dark`. Reproduced against the untouched `f75fe7e` baseline on port 3106, using an ignored `git archive HEAD` copy. The provider/library code is unchanged by this redesign. Regular saved light/dark, device independence, theme wave and reduced-motion tests pass.
2. Snapshot workflow: waits for the old label «Ссылка на снимок». The current baseline dialog puts «Самодостаточная ссылка» under «Другой способ: ссылка без публикации». Reproduced the same missing-label timeout against the untouched baseline with the same clipboard permissions.
3. Image snapshot workflow: waits for the same obsolete label. Source and failure trace show the same selector mismatch; sharing source files are unchanged.

To check actual current behavior, copied the two existing workflows into ignored QA files and adapted **only** the current disclosure/label/button selectors. Repository tests and application behavior were not altered. Both adapted tests passed separately:

- Full create/edit/preview/reload/JSON/copy/share/new-tab/immutable-snapshot/history workflow: **1 passed**. The old snapshot retained its original title and task status after source edits and viewer reload.
- File/paste/drop/replace/JSON/DOCX/image-snapshot workflow: **1 passed**. The shared image survived viewer reload and the viewer remained read-only.

These are separate QA runs, not a claim that the original 40-test command passed. No browser console errors were reported by the passing workflows' existing assertions. No hosted publication or deployment was attempted.

Raw results: [browser suite](e2e-suite.txt), [adapted snapshot](snapshot-workflow.txt), [adapted image snapshot](image-snapshot-workflow.txt), [baseline snapshot failure](baseline-snapshot.txt), [baseline legacy-theme failure](baseline-theme-and-workflow.txt).


### Final design gate

**GATE: OPEN 21 (rounds used up)**. The gate completed three rounds; it is not reported as passed. The remaining findings are marketing-page prescriptions (full-screen hero/sections, promotional closing CTA, `.wrap` markup and unpadded text lines). They conflict with the requested compact operational page. The actual library/header outer edges are aligned; panel content keeps intentional padding. No checker or kit file was edited.

Every open finding, with its target and message, is retained in [gate output](gate-final.txt) and [structured gate result](gate-result.json).

| Open check | Count | Reason retained |
| --- | ---: | --- |
| hero-fill | 1 | The real library is visible in the first viewport as requested. |
| cta | 1 | The names disclosure is a utility, not a promotional close. |
| hero-screen | 2 | The overview uses content height rather than a full empty screen. |
| section-height | 3 | Library, disclosure and storage note use their real content heights. |
| section-air | 1 | The disclosure retains a usable 44px hit area and panel padding. |
| one-section | 4 | Multiple useful dashboard groups share a screen; native disclosure and footer semantics remain. |
| container-edges | 7 | Equal outer panel edges and padded list content replace marketing wrap/split requirements. |
| row-lines | 1 | Task totals keep the overview panel padding. |
| container | 1 | Existing dashboard markup uses its scoped centered container, not the marketing kit wrap. |

Four specific waivers were recorded (and are included in [waivers.json](waivers.json)):

- **focus-ring**, `.focus-visible\:outline-none:focus-visible`: Existing vendor/editor CSS loaded globally; this selector has no matching dashboard control. Main-page keyboard focus is visible in the production Tab check. Editor focus styling is outside this page redesign.
- **focus-ring**, `.bn-snapshot-name:focus`: Existing vendor/editor CSS loaded globally; this selector has no matching dashboard control. Main-page keyboard focus is visible in the production Tab check. Editor focus styling is outside this page redesign.
- **focus-ring**, `.bn-shadcn .bn-editor:focus-visible`: Existing vendor/editor CSS loaded globally; this selector has no matching dashboard control. Main-page keyboard focus is visible in the production Tab check. Editor focus styling is outside this page redesign.
- **moment-none**, `(the page)`: The user requests less empty space and readable operational content on the existing dashboard. A decorative marketing scroll section would delay plan retrieval and conflict with that scope; existing functional motion is retained.

The production gate reports 18 warnings, retained in [consistency details](consistency-production.json). The English-language copy heuristics do not tokenize the Russian heading or recognize the existing Russian action labels; the copy lint itself reports no failures or warnings in the gate. Other retained warnings concern promotional CTA placement, existing progress indicators, marketing section spacing and share-preview metadata outside this page scope.

### Screenshot and checker coverage

Inspected the final local production page at 1440, 1024, 820, 768 and 390 with the skill screenshot tool. The view remains usable with larger text and natural wrapping. The 320/1366/1920 geometry is covered by the existing browser suite rather than a claim of screenshot review. Dark mode was visually reviewed; light/dark switching and print equivalence were covered by the passing existing browser tests.

The standalone `assets/layout/check.mjs` crashed with `Cannot read properties of undefined (reading map)` and `r.sections is not iterable`. It saved the 1440 capture before failing. This checker is **unavailable**, not passed; its [failure output](layout-checker.txt) is included. The integrated gate and full consistency checker ran separately.

[Before desktop](before-1440.png) · [After desktop](after-1440.png) · [Before phone](before-390.png) · [After phone](after-390.png) · [1024](after-1024.png) · [820](after-820.png) · [768](after-768.png).

### Performance result and remaining limits

The unmodified skill performance check ran three samples at 1440 and 390 on the local production build: **2 FAIL, 0 WARN**. Both failures are its **JS parsed** budget: **1049.2 KiB** uncompressed JavaScript (336.1 KiB gzipped), one finding at each width. This is a measured open result, not a performance pass. No dependencies were added by this redesign; JavaScript bundle optimization is deferred outside the main-page typography/layout scope.

All other reported rows passed: approximately 524 KiB total transfer, four font files across the two existing families, 0.9 KiB image transfer, zero broken requests and zero WebGL contexts. Measured layout shift was **0.005 desktop / 0.000 phone**. Median CPU-rendered LCP was **220ms desktop / 284ms phone**; these are synthetic localhost timings, not field or real-device performance. See [performance output](performance.txt) and [raw measurements](performance.json).

The final gate remains **OPEN**, the standalone layout checker remains **unavailable**, and the original browser suite retains the three baseline/stale-test failures described above. These limits are preserved in the report rather than presented as an all-green release.

### Handoff

The reviewable source changes are `.gitignore`, `src/features/plans/dashboard.tsx` and `src/features/plans/dashboard.css`, plus this report and its evidence. Changes are local and uncommitted on `design/student-council-impeccable`; no push, merge or deployment occurred. The local production preview is at `http://127.0.0.1:3105/`. The temporary baseline server was stopped.
