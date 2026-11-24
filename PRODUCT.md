# IPOS.Plan product context

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Student Council media coordinators prepare content and event plans, assign responsibilities, and check what is due.
- Media-sector editors develop the brief, collect references, and update task details in their local plan library.
- Council members who receive a link, a DOCX file, or a printout need to understand what to deliver, who owns it, and when it is due.

## Product Purpose

IPOS.Plan turns ideas for posts, videos, and events into Russian-language plans that people can act on. A coordinator can create or import a plan, write the brief, assign tasks, check progress, and share a readable result. The plan should be usable as a working document and as a handoff to the people doing the work.

## Positioning

IPOS.Plan is a document-first planning workspace for a university media team. The brief, references, and structured assignments belong to the same plan. A task retains its context while remaining searchable and editable by assignee, status, priority, and deadline.

## Operating Context

The typical flow is to find or create a plan, write or import its brief, attach references, assign tasks, and review the result before sharing. Workspace mode supports writing alongside the outline and task inspector. Document mode presents the same plan as an A4-oriented document for review, printing, or export.

The plan library also supports duplication, remembered assignment names, revisions, and backup and restore. A remembered name is a locally stored assignment label. Some tasks have no deadline, so preserve the option to leave the date blank.

## Capabilities and Constraints

- Drafts, tasks, revisions, and event history are stored in IndexedDB for the current browser, profile, and origin. Describe save and recovery in those terms. Access on a different browser or origin requires a deliberate transfer such as a JSON export and import.
- The BlockNote document and its structured assignments belong to the same plan. Preserve block editing, task identity, and version checks across edits and multiple open tabs.
- JSON carries portable plan data. Library backups carry multiple plans and their history. DOCX and A4 print are readable handoff formats.
- A `/view#p=…` link carries a read-only snapshot that retains its contents after the source plan changes. A named `/p/[id]` publication is a separately managed public copy with operations for updating or removing it. Drafts still live in the local library.
- Assignment records responsibility. The coordinator shares the plan through the existing link or export flow.

## Brand Commitments

Use the IPOS.Plan name, the established Student Council institutional identity, the existing emblem assets in their intended roles, and plain Russian UI copy. Use specific task language such as «Новый план», «Импорт JSON» and «Резервная копия». The [Student Council brandbook](https://www.figma.com/design/836q18CXC7jTT4FRrRQvUM/Brandbook) is the identity reference named for the project.

## Evidence on Hand

- Product behavior and data model are documented in the [README](README.md), [architecture](docs/ARCHITECTURE.md), and [portable plan schema](docs/PLAN_SCHEMA.md).
- The [main-page review](docs/design/reports/main-page-2026-11-22/README.md) records the dashboard baseline, screenshots, and verification at the time of that change.

## Product Principles

1. Keep the brief and its assignments together.
2. Make the next action, owner, and deadline easy to find.
3. Make local saving, recovery, and external sharing explicit.
4. Preserve the ability to review, transfer, and print a plan.

## Accessibility & Inclusion

Plan names, Russian labels, long names, and due dates need room to wrap. Primary flows must work with keyboard and touch. Use readable text, visible focus, explicit labels, and status text alongside semantic color. Honor reduced motion and preserve core workflows on narrow screens.
