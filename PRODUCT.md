# IPOS.Plan — Product Context

<!-- impeccable:product-schema 1 -->

> Durable product context for future work on IPOS.Plan. This document describes the **current product and confirmed constraints**, not a redesign brief or a feature promise. Checked against `main` at `f75fe7e` (27 October 2026); reviewed 16 November 2026.

## Platform

web

## Users

- **Primary:** the IPOS/SMI coordinator of the MSU Dushanbe branch Student Council, preparing content plans, assigning tasks and checking delivery.
- **Editors:** media-sector participants working on plans, filming briefs, posts, Reels, events and responsibilities. In the current product, editing takes place in each person's **own local browser library**, not in a shared collaborative workspace.
- **Readers:** Student Council colleagues who receive exported documents or read-only links and need to understand what to do, who is responsible and when.

## Product Purpose

IPOS.Plan is a Russian-language, local-first workspace for turning Student Council media ideas and event requirements into **structured, actionable content plans**. A plan may contain editorial copy, references, step-by-step production instructions, media, and task records with assignee, deadline, priority and status.

The core success criterion is practical: a coordinator can create or import a plan, make responsibilities unambiguous, keep the working version safely, and share a readable result without reformatting it in another application. Product success must not be represented with invented adoption metrics.

## Positioning

A **document-first content-planning tool**, not a generic Kanban SaaS. The same plan supports a spacious editing workspace, a document-oriented A4 view, task inspection, JSON/DOCX portability, and read-only sharing. The document is the source of context; tasks stay linked to their brief rather than becoming disconnected checklist cards.

The distinctive mechanism is this local-first combination of **rich editorial briefs + structured work assignments + portable presentation**. Do not describe the app as a real-time collaborative project manager.

## Operating Context

1. A coordinator receives a raw idea, Instagram reference, event programme or production request.
2. They create/import a plan and describe **what to deliver, how to make it, the reference and the person responsible**.
3. They add or edit structured tasks, statuses, deadlines and priorities within the plan; use search, filters and the task inspector.
4. They review the document, save revisions, create an export or share a read-only snapshot/page.
5. Team members consume the link or document and act on the brief; any feedback or work-status update must be reconciled by the coordinator in the editor.

Frequent artifacts include Instagram Reels production plans, event announcements, photo/video assignments, design briefs and scripts. Some tasks intentionally have **no deadline**; do not invent one merely to fill a field. A reference link is evidence of inspiration, not proof that the linked media was inspected.

## Capabilities and Constraints

### Present in the repository

- Plan library: create, open, search, filter, import, duplicate, delete; task summaries and actual progress.
- Phase 3 adds local activist profiles, explicit participant links, a content calendar, a production board, editorial approval and analytics. Availability and review evidence are tracked in [ROADMAP.md](ROADMAP.md).
- BlockNote-based rich editor with headings, lists, notes, references, images and linked task blocks.
- Tasks: title, description, assignee, due date, status and priority; task inspection and direct editing.
- Workspace mode and A4-oriented Document mode, preview, printing and editable DOCX export.
- JSON import/export, templates, backup and restore, saved revisions and local history.
- Local autosave with visible feedback and safeguards against stale/concurrent writes.
- Read-only self-contained snapshot links and named public pages; published pages are owner-managed and use Vercel Blob. A public link is **not access-controlled private storage**.
- Owner administration routes `/admin/login` and `/admin` exist; they must not be conflated with a multi-user shared team backend.
- Light/dark appearance switch, dark-first default for new preferences, and a wave-style theme transition, with reduced-motion safeguards.

### Architectural boundaries

- **Stack:** Next.js App Router, TypeScript, React, BlockNote, Dexie/IndexedDB, Zod, Tailwind CSS, shadcn/ui/Radix, Motion and Vercel Blob for public-page publication.
- **Plan data is local:** drafts, tasks, versions and library records are in browser IndexedDB. They are scoped to origin/browser/profile; production, localhost and another device do not automatically share the same drafts.
- **No team sync or simultaneous co-editing:** do not imply that assigning a person's name grants that person access or sends a notification.
- **Do not silently move local plans to a server.** Any cloud sync, team accounts, permissions, notifications or AI automation is a separate proposal requiring a deliberate privacy, security and migration design.
- **Data portability is essential:** maintain JSON compatibility, safe import validation, rich document exports, backup/restore and readable sharing.
- **Existing behavior is a compatibility constraint:** keep A4 output, read-only viewer semantics, revision safeguards and mobile usability when changing UI.
- **Publishing differs from editing:** self-contained shared links are snapshots; short public pages may be updated/unpublished through their owner-management flow. Neither is live collaborative editing.
- **Admin security matters:** preserve server-side authentication, cookie security and rate limiting; never expose secrets or management keys in client bundles.

### Open product decisions — not shipped features

- Whether the sector needs a shared cloud workspace, roles, comments and notifications.
- Whether to unify the app's fonts completely with the Student Council website.
- Whether automated content discovery is useful for the media team.

These are decisions for a later product scope; they are not commitments or claims about the deployed app.

## Brand Commitments

- Product name: **IPOS.Plan**; functional labels and primary content language: **Russian**.
- Institutional context: **Student Council of the MSU branch in Dushanbe**. Preserve authentic Council/university emblems; the Student Council logo and the university branch emblem are different assets and must not be interchanged.
- The established brand palette is anchored by blue `#3A53D1`, deep blue `#132FC1`, restrained red `#C11316`, ink `#101010` and light paper `#EEEEEE`.
- **Requested reference:** https://student-council-ecru.vercel.app/ — Student Council public site, source repository `Human-Unit/Student_Council` (production deployment commit `1511752c`). Use its **identity and editorial discipline** as reference; do not transplant its landing-page spectacle into a dense planning editor.
- Existing IPOS.Plan design rules at `docs/design/IPOS_DESIGN_PLAYBOOK.md` are binding implementation context. More specific visual tokens and component treatments belong in `DESIGN.md`.

## Evidence on Hand

- IPOS.Plan: [README](README.md), [AGENTS.md](AGENTS.md), [design playbook](docs/design/IPOS_DESIGN_PLAYBOOK.md), [architecture](docs/ARCHITECTURE.md), [plan schema](docs/PLAN_SCHEMA.md).
- Current UI tokens and behavior: `src/app/globals.css`, `src/app/surfaces.css`, `src/app/dashboard-hero.css`, `src/features/plans/`, `src/app/admin/`.
- Student Council reference source: [Design system](https://github.com/Human-Unit/Student_Council/blob/1511752c547881df19578ca92f5469dc6b2cd204/docs/DESIGN_SYSTEM.md), [tokens](https://github.com/Human-Unit/Student_Council/blob/1511752c547881df19578ca92f5469dc6b2cd204/src/styles/tokens.css), [branding assets](https://github.com/Human-Unit/Student_Council/tree/1511752c547881df19578ca92f5469dc6b2cd204/public/brand).
- Evidence standard: the linked site was identified via its Vercel deployment and associated source commit. Its rendered UI was **not directly inspected in this documentation pass**; do not present code-derived descriptions as live visual acceptance or invent user feedback.

## Product Principles

1. **Actionable over decorative.** Every plan should make the next task, its owner and its definition of done clear.
2. **A document is the center of work.** Organize the information around coherent briefs; task status complements, rather than replaces, the document.
3. **Be truthful about data location and sharing.** A local library is local, a published link is public to its recipient, and a viewer cannot edit the owner's draft.
4. **Preserve user work.** Safe autosave, import validation, backups, versions and portability outrank cosmetic changes.
5. **Stay recognizably Student Council.** Use official identity with restraint; make operational screens fast and readable instead of copying a promotional landing page.

## Accessibility & Inclusion

- Russian/Cyrillic UI and long names must remain readable without truncating essential task information.
- Keyboard navigation, explicit focus indicators, semantic controls and clear error/empty states are required; do not convey status by color alone.
- Target WCAG AA contrast for functional text and controls, honor `prefers-reduced-motion`, and provide responsive flows for narrow mobile screens.
- Do not depend on hover or animation to reveal critical actions; preserve usability at 320px and under browser zoom.
