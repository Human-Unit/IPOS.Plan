# Paykar design reference library for IPOS.Plan

Source: [Human-Unit/Paykar.Shop](https://github.com/Human-Unit/Paykar.Shop), copied from its `main` branch on **2026-10-25** (reference commit at inspection: `229e277141833633a7f313f23ee0fc72174cb6f0`).

These files are **verbatim Markdown reference copies**, arranged under `docs/` to preserve the original relative paths as far as possible. The source repository has not been modified. Linked images, generated browser artifacts, and unrelated Paykar application files **were not copied**; some original Markdown relative links therefore point to unavailable local artifacts. Use the source GitHub links where necessary.

**Authoritative instructions for IPOS.Plan:** [IPOS Design Playbook](../IPOS_DESIGN_PLAYBOOK.md). References below demonstrate process and decisions, but do not override IPOS branding, storage contracts, routes, data, or requirements.

## Contents

| Reference | Best use for IPOS |
|---|---|
| [Design principles](docs/design-principles.md) | Meaningful empties, real data, next useful action |
| [Design system](docs/ui-coherence/design-system.md) | Systematic hierarchy, spacing, surfaces and responsiveness; adapt tokens, don't copy Paykar green |
| [UX audit](docs/ui-coherence/audit.md) | Evidence-led issue inventory and severity |
| [Route matrix](docs/ui-coherence/route-matrix.md) | Keep/refine/remove decisions and protected behavior |
| [Implementation plan](docs/ui-coherence/implementation-plan.md) | Incremental dependency-aware phases, gates and regression safeguards |
| [Admin UX rules](docs/admin/admin-ux-rules.md) | Quiet operational UI, status tables, focus/drawers, no invented data; ignore Paykar admin backend details |
| [Phase 0 discovery prompt](docs/redesign/phase-0-prompt.md) | User jobs, IA, hypothesis/observation distinction, acceptance criteria |
| [Hero QA report](docs/progress/homepage-hero.md) | Before/after, multi-width screenshots, meaningful measurement and real browser checks |
| [Final UI consistency audit](docs/progress/final-ui-consistency-audit.md) | Cross-page screenshot and interaction evidence |

## How to use

1. For IPOS design tasks read `docs/design/IPOS_DESIGN_PLAYBOOK.md` first.
2. Pick the Paykar examples relevant to the current IPOS surface rather than indiscriminately reading every archived commerce specification.
3. Record the current IPOS baseline, capture actual browser evidence, implement scoped changes, compare results and run regression checks.
4. Never transplant Paykar storefront colors, product-card/checkout semantics, auth/admin rules, or its local directory assumptions into IPOS.

This is documentation only. Copying these files did not change runtime styling, components, local user data, or Paykar itself.
