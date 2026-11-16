---
name: "IPOS.Plan"
description: "Institutional, document-first planning workspace for the Student Council media sector"
colors:
  brand-deep: "#132FC1"
  council-blue: "#3A53D1"
  brand-red: "#C11316"
  brand-ink: "#101010"
  brand-paper: "#EEEEEE"
  hero: "#12266F"
  white: "#FFFFFF"
  canvas: "#F5F6F9"
  foreground: "#17191D"
  muted-foreground: "#626873"
  border: "#DEDFE3"
  secondary: "#EEF1FC"
  light-ui-text: "#172033"
  light-ui-border: "#DCE1E9"
  dark-canvas: "#0B1120"
  dark-surface: "#151F31"
  dark-primary: "#9AACFF"
  dark-foreground: "#E8EDF6"
typography:
  display:
    fontFamily: "Montserrat, Inter, Arial, sans-serif"
    fontSize: "clamp(32px, 3.2vw, 42px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Montserrat, Inter, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  control: "6px"
  panel: "10px"
  hero: "12px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
components:
  button-primary:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
  dashboard-hero:
    backgroundColor: "{colors.hero}"
    textColor: "{colors.white}"
    rounded: "{rounded.hero}"
  plan-panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
---

# Design System: IPOS.Plan

> Design authority: current IPOS.Plan implementation at `Human-Unit/IPOS.Plan` (`main`, baseline `f75fe7e`) plus Student Council brand references from `Human-Unit/Student_Council`, matching the deployment of https://student-council-ecru.vercel.app/ at `1511752c`. This is an **incumbent-system document**, not an instruction to replace the UI. Runtime CSS variables in the app remain the source of truth; the frontmatter records the light-mode primitives for portable design tooling, not a second live theme engine.

## Overview

**Creative North Star: "Редакционная мастерская Студсовета".**

IPOS.Plan should feel like a calm, precise working table for a university media team: serious enough for briefs and approvals, fast enough for daily task assignments, recognizable as part of the Student Council. Its interface is an **Operate** surface; the document preview and published reader are **Read** surfaces. The referenced Student Council homepage is a **Persuade** surface. Their identities should align, but their interface density and motion should not be identical.

**Borrow from the Student Council reference:** institutional blue, restrained red, confident Cyrillic hierarchy, authentic vector/emblem assets, purposeful editorial rules and whitespace, clean high-contrast presentation. **Do not copy blindly:** oversized full-screen hero chapters, cinematic scrolling, ornamental illustration and sector-specific campaign colors do not belong in routine plan editing.

**Key Characteristics:**
- Clear primary action and a document-first information hierarchy.
- Quiet white/off-white work surfaces with institutional-blue identity.
- Fine separators, compact but readable operational metadata and deliberate whitespace.
- Dark appearance that is genuinely legible, not a simple inversion.
- Restrained motion that clarifies mode or state changes rather than competing with the work.

### Reference authority and intentional differences

| Source | Verified fact | How it informs IPOS.Plan |
| --- | --- | --- |
| Student Council site: `src/styles/tokens.css`, `docs/DESIGN_SYSTEM.md` | Blue `#3A53D1`, deep blue `#132FC1`, red `#C11316`, paper `#EEEEEE`; editorial chapters, cut-paper motifs and NT Somic VF | Reuse **identity and visual discipline** without moving the landing-page grammar into the editor |
| IPOS.Plan: `src/app/globals.css` | Product tokens, dark overrides, Inter UI and Montserrat headings | Keep current working theme and font choices until an approved brand-unification change |
| IPOS.Plan: `src/app/surfaces.css`, `dashboard-hero.css` | Compact library, dark-blue hero, plan rows, dialogs, editing controls | Use these as the implemented component baseline, not a new generic dashboard |
| IPOS.Plan: `docs/design/IPOS_DESIGN_PLAYBOOK.md` | Evidence-led UX audit, responsive/document constraints, clear hierarchy | Continue to follow it for design reviews and implementation decisions |

The reference site's logo and the **branch emblem** are separate graphics. Use only each asset's approved implementation in its proper role. The source-based reference was verified via the Vercel deployment's linked repository; **no live rendered screenshot was inspected during this documentation pass**.

## Colors

The palette pairs a confident blue brand with neutral surfaces. Keep campaign accents subordinate to the content and status semantics.

### Primary

- **Council Blue** (`#3A53D1`): identity and brand-facing details from the Student Council website; available as IPOS `--brand-blue-secondary`.
- **Institutional Deep Blue** (`#132FC1`): IPOS light-mode `--brand-blue` and `--primary`; functional links, focus and selected actions.
- **Dark Hero Blue** (`#12266F`): IPOS `--hero`; large dashboard orientation field with white text. It is a specific surface token, not a general background color.

### Supporting accent

- **Council Red** (`#C11316`): `--brand-red` and destructive/danger semantics, not a competing everyday CTA.
- Success/warning/cancelled use their implemented **semantic** variables and labels rather than adopting arbitrary brand hues. In dark mode the semantic colors are remapped for contrast.

### Neutral

- **White** (`#FFFFFF`): light editor, cards and controls.
- **Paper** (`#EEEEEE`): Student Council reference paper tone; not the default IPOS canvas.
- **Canvas** (`#F5F6F9`): IPOS light screen background.
- **Text Ink** (`#17191D`): primary light-mode interface text; the reference site's own `#101010` is a separate brand ink.
- **Supporting Text** (`#626873`), **Border** (`#DEDFE3`), **Secondary** (`#EEF1FC`): quiet metadata, boundaries and selection-neutral fills.

### Dark appearance

- Dark canvas `#0B1120`, dark surface `#151F31`, foreground `#E8EDF6`, primary `#9AACFF`; use the existing `.dark` semantic overrides.
- Never hard-code a light-only token in a component that needs to respond to themes. The YAML frontmatter describes representative light-mode values; source CSS defines adaptive behavior.

**The One Primary Action Rule.** Within a decision group, a single primary blue action leads. Supporting actions recede; dangerous actions remain distinct and confirmed.

## Typography

**Current product fonts:** `Montserrat` for headings; `Inter` for controls and body copy; document typography is separately configurable. The Student Council reference site uses the licensed local **NT Somic VF**, which is **reference information, not a font migration already made in IPOS.Plan**.

**Character:** editorial confidence for titles, restrained clarity for workflows. The UI is Russian-language; spacing, wrapping, grammatical correctness and unbroken critical information matter more than ornamental letterforms.

### Hierarchy

- **Dashboard display:** Montserrat 700, `clamp(32px, 3.2vw, 42px)`, line height 1.15, tracking -0.035em; current desktop hero, adjusted on mobile.
- **Section title:** Montserrat, approximately 20px with clearly subordinate headings and no false uppercase hierarchy.
- **Library/row title:** Montserrat, around 17px and 600 weight, capable of wrapping long Russian plan names.
- **Body:** Inter, 14px/1.5 in interface; document prose follows independent document tokens (light-mode default `--document-body: 17px`).
- **Supporting metadata:** Inter 12–13px only where appropriate; functional instructions must remain readable and not shrink into decorative captions.
- **Task/document emphasis:** use the existing document title/task tokens rather than letting dashboard typography change print layout.

**The Content First Rule.** Do not force uppercase, clip Cyrillic descenders or shorten necessary details. Preserve the reference site's care with Russian typography without transplanting its huge display sizes into task cards.

## Layout

- **Dashboard:** centered `max-width: 1184px`, desktop padding 32px; the app bar is a separate, relatively compact navigation surface.
- **Working hierarchy:** brand/app bar → dashboard orientation hero → real work metrics and search → contiguous plan library. Keep import/backup utilities accessible but visually secondary to plan retrieval and creation.
- **Plan rows:** one coherent list with 48px icon column, flexible title/content and an actions region; use dividers and metadata, not nested decorative cards.
- **Editor:** free-width **Workspace** for writing and inspecting tasks; **Document** mode for A4-centered reading and printing. The actual print stylesheet is authoritative.
- **Document:** retain ~210mm A4-oriented paper and established print width (~178mm content); do not stretch document prose to the editor's full screen width.
- **Spacing:** existing 4/8/12/16/20/24/32/40/48px scale; use a consistent rhythm and generous major separations without creating unusable blank areas.
- **Responsive:** the app's principal narrow-screen threshold is around 767px. The hero becomes one column with 24px padding, principal action grows to full width, controls are readable at a minimum 16px for mobile text input, and plan rows/inspectors adapt without horizontal clipping.
- **Test widths:** 320, 390, 768, 1024 and 1440px at minimum, as guided by the project's UI playbook; test long titles, empty/error states and open dialogs, not just a short seeded demo.

**The Single Work Surface Rule.** The document and its related controls have visual priority; peripheral chrome must not compete with the content.

## Elevation & Depth

Primarily **flat and ruled**: light backgrounds, tonal separation and borders convey structure. Shadows mark overlays or elevated work surfaces, not every item.

- Light document shadow: `--page-shadow: 0 2px 8px rgb(23 25 29 / 4%)`.
- Dark-mode document shadow: `0 2px 8px rgb(0 0 0 / 12%)`.
- Current modal overlay panels: `0 16px 64px rgb(20 26 43 / 15%)`.
- The Student Council landing site contains intentionally scoped glass, glow and cut-paper effects. These are valid for its promotional context; they are **not** a universal prescription or a ban on those effects inside existing approved brand areas.

**The Flat by Default Rule.** A plan row starts flat; use actual focus/hover state, selected state or a dialog to justify elevation.

## Shapes

- Controls: `--ui-control-radius: 6px`; panels: `--ui-panel-radius: 10px`; dashboard hero: `--ui-hero-radius: 12px`.
- The two-position appearance switch uses an intentionally pill-shaped track with a circular thumb; it is an exception, not a reason to pill every button.
- Student Council reference uses geometric logo parts, numbered pentagonal tabs and larger rounded campaign surfaces. Only introduce those distinctive shapes to IPOS when they clarify a brand/signature surface, without replacing practical table/list forms.
- Borders are subtle and precise; a section does not need three nested boxes to communicate grouping.

## Components

### App identity and header

- Preserve the IPOS.Plan wordmark, correct current emblem and local-state disclosure.
- Keep navigation compact; desktop alignment and phone layouts must remain usable with long labels.
- Show real save/storage state instead of a vague “synced” message.

### Dashboard hero

- Deep-blue `var(--hero)`, white text, 12px radius, one visible leading action **«Новый план»**; the hero orients, it is not an advertisement.
- Current desktop: padding 32px 36px; mobile: 24px. Description is secondary and restricted in line length.
- Avoid large extra illustrations, invented statistics or multi-button competition.

### Buttons and links

- Primary: `var(--primary)` and `var(--primary-foreground)` under theme semantics; preserve visible hover/focus/disabled differences and clear verb labels.
- Secondary/ghost: neutral styling for import, restore, details and convenience actions.
- Destructive: use `var(--destructive)` semantics plus a confirmation where irreversible.
- For public/shared links, differentiate **copy**, **open**, **update** and **unpublish**; do not conceal side effects behind a generic label.

### Plan library rows

- Title, modified information, real status/progress and actions must scan in one row.
- Light hover emphasis, subtle divider and clear selected/focus state.
- Wrap titles and preserve real assignments and deadline context. No invented assignees or placeholder deadline in stored data.

### Inputs, tasks and inspector

- Input/textarea/select: `var(--background)`, `var(--input)`, 6px radius and clear `var(--primary)` focus ring.
- Labels are explicit and Russian; statuses require text as well as color. The task inspector keeps assignee, priority and date editable without burying the associated brief.
- Do not let responsive drawers or dialog scroll locks obscure the save action or trap keyboard focus.

### Document / brief / viewer

- BlockNote remains the editable source; A4-mode preview, exported DOCX, JSON and public read-only rendering must agree on task content and references.
- The read-only viewer must not show editable controls; shared-page decorative branding must not change the meaning or privacy of content.
- Long links, photographs and user-authored paragraphs must wrap or fit safely.

### Themes and motion

- Current light/dark switch defaults to dark for new preferences; existing explicit choices persist. The wave transition is already implemented and must not flash the old/new theme or override reduced motion.
- Favor the existing `--motion-fast: 160ms` for small state responses; theme-thumb motion has its own longer timing. Do not append unrelated background movement.
- The Student Council site's cinematic reveals, spotlight and large animated hero are **reference-site patterns**, not default editor behavior.
- Preserve `prefers-reduced-motion`, accessible focus, keyboard operation and readable still states.

## Do's and Don'ts

### Do

- **Do** maintain the shared blue/red identity of the Student Council with existing IPOS semantic tokens.
- **Do** build around actual plan documents and the user's next action; let task status and deadlines be factual.
- **Do** use Montserrat/Inter and current layout tokens unless font unification is explicitly approved.
- **Do** preserve the distinction between the Student Council logo and the branch emblem.
- **Do** test light and dark themes, 320–1440px layouts, A4 export/print, read-only links and keyboard navigation after UI changes.
- **Do** inspect current screenshots/browser output before claiming a visual regression or an improved rendered result.

### Don't

- **Don't** redesign IPOS.Plan as a generic gradient SaaS dashboard, a glass-heavy showcase or an imitation of the Student Council promotional homepage.
- **Don't** introduce arbitrary new brand colors, sector-specific orange/green palettes or fake organizational metrics into an IPOS planning interface.
- **Don't** use oversized headline compositions, decorative cards within cards or spectacular motion in operational views.
- **Don't** recolor the official logo, substitute unofficial icons, fabricate students/team records or make unverifiable official claims.
- **Don't** break IndexedDB/local-first behavior, task/schema compatibility, version safety, share semantics, A4 print or JSON/DOCX exports to achieve a purely visual change.

### Source locations and verification

- Current app: `src/app/globals.css`, `surfaces.css`, `dashboard-hero.css`, `workspace.css`, `document.css`, `print.css`; `docs/design/IPOS_DESIGN_PLAYBOOK.md`.
- Reference identity: [Student Council design baseline](https://github.com/Human-Unit/Student_Council/blob/1511752c547881df19578ca92f5469dc6b2cd204/docs/DESIGN_SYSTEM.md), [reference tokens](https://github.com/Human-Unit/Student_Council/blob/1511752c547881df19578ca92f5469dc6b2cd204/src/styles/tokens.css) and [reference site](https://student-council-ecru.vercel.app/).
- This document describes the code-confirmed state and a conservative design direction. **It is not a claim of a live browser visual review, nor an implementation of new visual changes.**
