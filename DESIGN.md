---
name: IPOS.Plan
description: "Student Council media planning and document authoring"
colors:
  brand-blue: "#132fc1"
  brand-blue-secondary: "#3a53d1"
  brand-red: "#c11316"
  cobalt-ink: "#101f5c"
  cobalt-cover: "#173abf"
  cobalt-light-canvas: "#e9edf7"
  cobalt-dark-canvas: "#0b1229"
  light-canvas: "#f5f6f9"
  light-surface: "#ffffff"
  light-ink: "#17191d"
  light-border: "#dedfe3"
  light-overview: "#12266f"
  dark-canvas: "#0b1120"
  dark-surface: "#151f31"
  dark-ink: "#e8edf6"
  dark-border: "#35455e"
  dark-primary: "#9aacff"
  dark-overview: "#1c317d"
typography:
  dashboard-heading:
    fontFamily: "Montserrat, Inter, Arial, sans-serif"
    fontSize: "38px"
    fontWeight: 750
    lineHeight: 1.06
  dashboard-plan-title:
    fontFamily: "Montserrat, Inter, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 680
    lineHeight: 1.3
  dashboard-body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "16px"
  document-body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "17px"
rounded:
  control: "6px"
  panel: "10px"
  overview: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  control-gap: "12px"
  mobile-gutter: "16px"
  panel-padding: "24px"
  desktop-gutter: "32px"
  section-gap: "48px"
---

# IPOS.Plan design system

## Overview

The Student Council’s editorial workspace should put the work within reach on the first screen. A coordinator can recognize the right plan by title, see its progress, and open it to continue a brief. The editor keeps the document central while the outline and inspector support navigation and assignment editing. The shared reader is oriented around the document and its tasks.

**Approved interaction reference: Ghost Admin.** Its content library pairs a title-led list with adjacent filters and metadata. Its editor gives the text a stable reading column and makes formatting contextual. Apply these patterns using IPOS.Plan’s existing components and Russian content. The Student Council identity supplies the visual vocabulary. [Ghost content library](https://ghost.org/help/organizing-content/) · [Ghost editor](https://ghost.org/help/using-the-editor/)

The cobalt-and-ink dashboard pairs a navy app bar with a Council-blue resume card. The card shows the last edited plan and its next unfinished task. The saved-plan library occupies the main work area. The editor and reader share the cobalt cover. Runtime sources are [globals.css](src/app/globals.css), [cobalt-surfaces.css](src/app/cobalt-surfaces.css) and [dashboard.css](src/features/plans/dashboard.css).

## Colors

Use institutional blue for identity and the primary action. The compact overview can use its deeper blue field. Use neutral canvas, surface, and border tokens for the library and editing chrome. Reserve red and existing warning, success, and cancelled tokens for their semantic roles. Accompany those states with text or a meaningful symbol.

The resume card uses a cobalt paper fold to connect the workspace to the editor and reader covers. Interactive states continue to use semantic theme tokens.

Use semantic CSS variables so focus, selection, controls, and status treatments adapt to light and dark appearance. Check functional text at 4.5:1, large text at 3:1, and meaningful control boundaries and icons at 3:1 where applicable. Print uses the existing document and print styles.

## Typography

Montserrat gives headings and plan names their hierarchy. Inter serves labels, controls, and metadata. The dashboard baseline is 16px for body and 14px for labels and metadata. Plan titles use 18px on desktop and 16px on mobile. Keep functional text legible, allow Cyrillic titles and names to wrap, and preserve the separately configurable document typography.

## Layout

- **Dashboard on desktop.** Put «Новый план» beside the page title. Align the resume card and task totals beside the saved-plan library at wide widths. Group search and filters directly above the rows. The overdue count opens the overdue filter, and result rows identify the overdue task, deadline, and assignee when available. Let the first plan title and its real status take precedence over empty space or oversized counters.
- **Dashboard on mobile.** Use a single column with readable controls and wrapping titles. Bring the first saved-plan title higher by tightening the area above the list before reducing text size or touch targets. Keep import and backup discoverable, and preserve the keyboard and visual reading order.
- **Editor.** Give the brief a stable reading measure. Keep outline and task inspector beside it where space allows and use the existing narrow-screen panel behavior when width is scarce. Keep the plan title, save state, mode, and share action easy to locate.
- **Reader and print.** Use the existing A4-oriented document surface, with the brief, references, and tasks in reading order. Keep document controls and editor chrome outside the print area. Use the current print stylesheet as the authority on page geometry.

The dashboard aligns to a 1248px grid with 32px desktop, 24px tablet, and 14px mobile gutters. On tablets and phones, the overdue filter remains visible beside the task-totals disclosure. Search gets its own row. «Файлы» reveals import and backup in the library header. Desktop gives those actions direct access. Follow the [design playbook](docs/design/IPOS_DESIGN_PLAYBOOK.md) for the responsive and workflow acceptance matrix. Check both themes, long Russian titles, a populated plan list, empty and filtered results, save errors, and short-height dialogs.

## Elevation & Depth

Use tonal separation and thin dividers to group ordinary rows. Use existing elevation for floating controls, dialogs, and the document sheet where it helps distinguish layers. The dashboard paper fold responds to hover. Task-count changes and active filters use short transitions. Inspector selection keeps its own transition. Respect reduced motion and preserve the original print presentation.

## Shapes

Use the established radii for controls, panels, and the overview. Keep the logo and emblem in their existing roles. Make interactive controls distinct through shape, text, boundary, or focus treatment.

## Components

| Component | Guidance |
| --- | --- |
| Library toolbar | Give search and filter explicit labels. Show the active result state and make clearing a filter easy. Keep import and backup secondary and discoverable. |
| Plan row | Lead with the title as the open action. Follow with update time, task counts, and useful progress context. Give duplicate and delete accessible names and independent targets. Keep confirmation for deletion. |
| Dashboard states | Give a fresh empty library a create or import action. Give a no-match result a reset action. Explain storage and load errors where the user can recover. |
| Editor controls | Keep formatting contextual to the current block or selection. Keep task properties in the inspector and keep save feedback visible. Preserve existing shortcuts and undo. |
| Sharing | Show the snapshot and public-page choices together with their consequences before displaying their controls. |
| Shared reader | Present the contents as read-only. Distinguish an unavailable publication and an invalid snapshot with clear recovery guidance. |
| Buttons and focus | Lead with one primary action per decision group. Make keyboard focus visible and use touch targets of at least 44px for dashboard controls. |

## Do's and Don'ts

- Use the real list, titles, tasks, progress, and storage state to establish visual hierarchy.
- Keep the existing Student Council identity when adapting interaction patterns from Ghost.
- Preserve local storage disclosures, import and backup access, and the difference between an immutable snapshot and an editable source plan.
- Verify changed workflows on rendered screens before claiming visual acceptance.
