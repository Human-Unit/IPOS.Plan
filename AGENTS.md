<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## IPOS.Plan design and UX guidance

For any UI, visual design, responsive layout, component, or UX changes, read `docs/design/IPOS_DESIGN_PLAYBOOK.md` **before editing**. Use its evidence-led audit workflow and test matrix.

The Paykar documents at `docs/design/paykar-reference/` are **reference examples only**. Do not apply their green brand, commerce routes, backend rules, or old project commands to IPOS.Plan. Preserve IPOS's local IndexedDB storage, BlockNote editing, immutable sharing, JSON/DOCX export, A4 print and responsive interaction behavior.

For a design review, inspect actual screenshots first and distinguish observed defects from code-only hypotheses; do not claim browser acceptance without a real rendered check. Do not treat copying reference docs as authorization to redesign runtime UI.
