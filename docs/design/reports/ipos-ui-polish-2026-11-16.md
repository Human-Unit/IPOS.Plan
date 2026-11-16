# IPOS.Plan — Interface polish and responsive reliability

**Date:** 2026-11-16  
**Scope:** dashboard and editor chrome, responsive toolbar, administration entry, theme-native details  
**Review method:** source-based design and implementation assessment, followed by browser-test validation in CI. **Live manual browser assessment was unavailable** (Browser Use connection returned `insufficient_credits`); the existing screenshot archive is prior-run evidence and not asserted to match this revision.

## Source of direction

- `PRODUCT.md`: document-first, Russian-language, local-browser plans; no invented collaboration, cloud sync, or due dates.
- `DESIGN.md`: restrained institutional blue, Montserrat titles and Inter controls, single primary action, quiet white/dark surfaces; separate operative UI from promotional Student Council landing pages.
- `docs/design/IPOS_DESIGN_PLAYBOOK.md`: preserve existing behavior and A4, validate a real content flow, check 320–1920px widths and reduced motion.
- [Impeccable](https://github.com/pbakaus/impeccable/blob/main/.claude/skills/impeccable/SKILL.md): **Operate** mode, `layout` and `polish` workflow, especially responsive order and browser-native details.
- [Anthropic Frontend Design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): client-specific character; resist generic dashboard chrome, let information hierarchy direct attention.
- [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md): accessible touch controls, dark/light semantics, product-appropriate component rhythm.
- [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md): meaningful control labels, focus, readable long text, input contrast and responsive layout.
- [Vercel React Best Practices](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md): prefer simple class/layout changes to new client state or heavy dependencies.

## Keep / refine / remove

| Decision | Surface | Why |
| --- | --- | --- |
| Keep | Blue hero, brand emblems, editor paper, dual theme, print modes | Existing visual identity and core product constraints |
| Keep | Document-first blocks, local autosave, share/export and A4 | Source of user value; unrelated to visual polishing |
| Refine | Sticky editor header | The document title remains discoverable when scrolling a long plan on a wide screen |
| Repair | Small-screen editor actions | Garbled hardcoded `aria-label` selectors in the CSS could not match the buttons |
| Refine | Admin sign-in and header | Remove redundant eyebrow and give actual brand identity and truthful browser-storage copy |
| Refine | Theme-native browser details | Caret, selection, scrollbars and link underline offset follow existing tokens |
| Remove | Misleading library subtitle "Обновлены недавно" | It did not represent actual sort or plan recency |

## Implementation

1. The editor's wide sticky header shows a truncated *real* plan title, not a dummy breadcrumb. It disappears below 1280px to protect the compact toolbar.
2. Toolbar controls now have stable `data-editor-action` identifiers. CSS explicitly positions preview, overflow and share actions in the second mobile row and the focus action in the first. Accessible Russian labels remain intact and **are not reused as layout selectors**.
3. Admin sign-in uses the existing IPOS emblem and wordmark, separates the title and form from the return link, and states accurately that drafts stay in this browser. The redundant admin eyebrow is removed from the workspace.
4. Browser-native text selection, caret, scrollbar and link underlining inherit the app's semantic colors. No new colors, fonts, design dependencies or gratuitous motion are introduced.
5. The dashboard subtitle states that drafts are local, rather than claiming they were recently updated.

## Validation plan and boundaries

- New Playwright checks in `tests/e2e/editor-layout.spec.ts` assert button placement and horizontal overflow at 320/390/767px, and contextual plan title at 1440px.
- Updated `tests/e2e/admin-access.spec.ts` checks sign-in identity/copy and no 320px horizontal overflow.
- Existing CI covers lint, TypeScript, unit tests, production build and E2E workflows for editing, sharing, mobile layouts and data safety.
- **No client datastore schema, task document, public link format, A4 print styling, export data, authentication contract or new runtime dependencies were changed.**
- CI checks are necessary but not equivalent to independent visual signoff. After opening a preview on a real browser, inspect light/dark at 320, 390, 768, 1280 and 1440px and test keyboard focus, zoom and touch behavior. Keep the PR unmerged until that is satisfactory.

## Known limitation

A live visual baseline could not be captured in this environment due to unavailable browser credits. This pass therefore claims **code-confirmed improvements** and reports browser-test results separately; it does not claim screenshot-verified aesthetic outcomes or physical-device testing.
