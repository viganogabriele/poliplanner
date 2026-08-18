# Poliplanner UI/UX Audit

## Audit scope

The audit covered the primary routes:

- Dashboard
- Lessons
- Piano di studi
- Exams
- Materie
- Subject detail
- Calendar
- Settings

The application was checked with populated and empty data at desktop, tablet, and mobile widths, including 320px, 360px, 390px, 480px, 768px, 900px, 1024px, and 1280px.

Key evidence:

- Calendar overflows horizontally by approximately 35px at 390px and 89px at 320px.
- The Piano layout becomes severely cramped at 1024px because the navigation, main content, and validation sidebar remain visible together.
- On mobile, the Piano validation summary appears near the bottom of a roughly 3,500px page.
- Accessibility checks found missing page headings, unlabeled exam filters, and a chart without an accessible text alternative.
- The existing dark palette is coherent and automated contrast checks did not identify broad color-contrast failures. The main visual problem is hierarchy and density rather than the palette itself.

Priority levels:

- P1 — High impact: usability, responsive, accessibility, or comprehension problem.
- P2 — Medium impact: recurring friction or inconsistency.
- P3 — Low impact: polish or discoverability improvement.

## Findings and recommendations

### Global shell and navigation

#### G-01 — Inconsistent page headings — P1 / High

Problem: Lessons, Calendar, and Settings do not have a visible page-level h1. Piano uses a much smaller heading than the other primary pages. This weakens orientation, page hierarchy, and accessibility.

Recommendation: Create a shared PageHeader component with a consistent h1, subtitle, actions, and responsive spacing. Add one useful h1 to every primary route.

#### G-02 — Important mobile destinations are hidden under “Altro” — P1 / High

Problem: Materie, Calendario, and Impostazioni are only available inside “Altro”. On those pages, “Altro” is highlighted instead of the actual destination, making the active location ambiguous.

Recommendation: Make the current destination visible in the mobile navigation, or make the expanded menu clearly identify the active item and label.

#### G-03 — “Altro” does not close on outside click — P1 / High

Problem: The menu closes with Escape but remains open when the user taps outside it. This is particularly confusing on touch devices.

Recommendation: Add outside-pointer dismissal, focus management, focus return to the trigger, and appropriate menu semantics.

#### G-04 — Fixed mobile navigation can cover content — P1 / High

Problem: The bottom navigation overlaps the last visible rows and headings on several pages. Existing bottom padding does not cover every nested layout.

Recommendation: Apply a reliable safe-area offset such as calc(5rem + env(safe-area-inset-bottom)) at the actual page and scroll-container level. Verify that no content ends underneath the fixed navigation.

#### G-05 — Sidebar footer is always visible — P2 / Medium

Problem: The “Istanza privata” message permanently occupies sidebar space and competes with primary navigation, even though it is low-frequency information.

Recommendation: Move it to Settings or a small status/help area while keeping it available to users.

#### G-06 — Weak surface hierarchy and excessive pill styling — P2 / Medium

Problem: Cards, buttons, badges, filters, and statuses all use similar dark surfaces, borders, shadows, large radii, and rounded shapes. The UI consequently feels visually flat and overly “pill-based”.

Recommendation: Establish clearer page, elevated-card, and inset surfaces. Reserve pills for statuses and filters; use moderately rounded cards and buttons for stronger hierarchy.

#### G-07 — Typography and date formatting are inconsistent — P1 / High

Problem: Raw ISO dates such as 2026-08-18 appear throughout the UI. Critical labels use very small text, and metric values can break into lines such as 2026- and 08-18.

Recommendation: Add shared Italian date-formatting helpers and use readable formats such as “martedì 18 agosto” or “18 ago 2026”. Increase important labels and prevent semantic values from wrapping.

#### G-08 — Interactive elements do not always look interactive — P1 / High

Problem: Clickable mode badges, filter chips, icon buttons, and linked cards often look static. Some controls use outline-none without a replacement focus style.

Recommendation: Standardize 40–44px touch targets, visible focus rings, hover/active/disabled states, tooltips for icon-only controls, and explicit affordances for linked cards.

#### G-09 — Information popovers overflow the viewport — P1 / High

Problem: Info popovers use fixed positioning and width. At mobile widths, Calendar and Exams popovers extend beyond the viewport.

Recommendation: Render them in a viewport-aware container or portal, clamp their position, use max-width: calc(100vw - 2rem), and support Escape, outside click, and focus return.

#### G-10 — Modal behavior is incomplete — P2 / Medium

Problem: The course modal does not consistently support Escape, focus trapping, focus return, body-scroll locking, or mobile-friendly text wrapping.

Recommendation: Align it with the confirmation dialog behavior and implement complete modal keyboard and focus management.

### Dashboard

#### D-01 — Repeated information creates noise — P1 / High

Problem: The missing-exam count, date, weekday, and completion percentage are each represented multiple times in the hero, KPI tiles, chart, and Today panel.

Recommendation: Keep one primary progress summary and one compact Today block focused on actionable lessons and next activity. Remove duplicate representations.

#### D-02 — Empty states can be misleading — P1 / High

Problem: With no calendar configured, the dashboard can say the user is fully caught up while still displaying virtual plan or exam information. This can be mistaken for real progress.

Recommendation: Distinguish between no data configured, zero pending work, and generated or virtual data. Add direct actions such as “Configura calendario” and “Crea il tuo piano”.

#### D-03 — Progress chart lacks a legend and accessible alternative — P1 / High

Problem: The donut chart relies on color and tooltips to explain its segments. The canvas does not provide a useful textual description.

Recommendation: Add a visible legend with labels and counts and an accessible summary such as “29 lezioni completate, 8 lezioni da seguire”. Do not rely on color alone.

#### D-04 — Subject progress cards lack a navigation affordance — P2 / Medium

Problem: Subject cards are links but look like static metric panels. The instruction “Clicca per…” is compensating for the missing visual affordance.

Recommendation: Add a chevron or “Apri materia” action and improve hover and focus states.

### Lessons

#### L-01 — Dense lesson groups are difficult to scan — P2 / Medium

Problem: Raw dates, uppercase weekday labels, long mode badges, and dense rows create visual friction.

Recommendation: Use localized dates, shorter labels such as “Asincrona”, and a secondary detail line for the full mode description.

#### L-02 — “Altre azioni” is too easy to miss — P2 / Medium

Problem: A small three-dot icon is the only entry point for important list actions.

Recommendation: Use a labeled “Azioni” button on larger screens and a properly sized icon button with a tooltip on mobile.

#### L-03 — Completing a lesson has no undo — P2 / Medium

Problem: A lesson disappears immediately after completion, and recovery requires finding a global reset action.

Recommendation: Add a short-lived undo toast or inline “Annulla” action.

#### L-04 — Long course names are truncated too aggressively — P2 / Medium

Problem: Mobile rows use one-line truncation, hiding meaningful course names.

Recommendation: Allow two-line wrapping on mobile and keep the full name available to assistive technology.

### Calendar

#### C-01 — Header action causes mobile overflow — P1 / High

Problem: “Modifica calendario” does not shrink or wrap correctly beside the header at narrow widths.

Recommendation: Stack the heading and action below the small breakpoint, or make the action full-width on mobile. Verify at 320px, 360px, and 390px.

#### C-02 — Subtitle contradicts the displayed week — P2 / Medium

Problem: The copy says lessons are distributed Monday–Friday, while the grid displays Saturday and Sunday.

Recommendation: Either remove weekends or change the copy to describe Monday–Sunday.

#### C-03 — Weekly grid wastes space and creates uneven cards — P2 / Medium

Problem: The four-column intermediate layout leaves an incomplete second row. Fixed minimum heights make short days as tall as days with multiple lessons.

Recommendation: Use a coherent weekday/weekend layout, allow cards to size naturally, and use compact empty-day states.

#### C-04 — Empty calendar state needs a direct action — P2 / Medium

Problem: The empty panel explains what to do but does not provide a strong primary button.

Recommendation: Add a clear “Configura calendario” CTA directly inside the empty state.

#### C-05 — Mobile schedule editor is too long and form-heavy — P2 / Medium

Problem: Six schedule rows become a long stack of dense cards, and save controls can be obscured by mobile navigation.

Recommendation: Use collapsible schedule rows with concise summaries, keep the active row expanded, add a sticky save bar, track dirty state, and confirm before discarding unsaved changes.

### Piano di studi

#### P-01 — Tablet breakpoint creates a broken composition — P1 / High

Problem: At approximately 1024px, the navigation, main plan, and 320px validation sidebar leave too little space for the main content. Buttons and labels wrap one word per line.

Recommendation: Hide or move the validation sidebar below the xl breakpoint. At tablet widths, use a single-column layout or an inline collapsible validation panel.

#### P-02 — Validation status is buried on mobile — P1 / High

Problem: Users must pass all advanced panels before seeing the main validation summary.

Recommendation: Show a compact plan-status summary directly below the header and current plan content on mobile. Keep detailed validation lower on the page.

#### P-03 — Plan status is repeated too many times — P2 / Medium

Problem: The successful state appears in the header, required-actions panel, sidebar, and metrics.

Recommendation: Use one prominent status banner and one detailed issue list. Remove redundant success panels.

#### P-04 — Too many accordions compete with the main task — P2 / Medium

Problem: Guide, career, future years, simulator, saved scenarios, and history have similar visual weight, making the page feel endless.

Recommendation: Group secondary tools under “Altre funzioni” or add in-page navigation while keeping every feature available.

#### P-05 — Duplicate “Aggiungi un insegnamento” actions are confusing — P2 / Medium

Problem: The same action appears in multiple panels.

Recommendation: Keep one primary CTA and use contextual secondary actions only where necessary.

#### P-06 — First-run and virtual plan states are ambiguous — P1 / High

Problem: With no saved plan, the UI can show generated content as a draft or consultation plan and offer a next-year action, implying that a real plan already exists.

Recommendation: Label generated content as “Proposta non salvata” or equivalent, make “Crea/Salva piano” the primary action, and explain the difference between a proposal and an active plan.

#### P-07 — Plan metrics and controls are too dense — P2 / Medium

Problem: CFU totals are repeated, important labels are tiny, category letters lack explanation, and “→ Soprannumero” is ambiguous.

Recommendation: Use one primary CFU total with a clear breakdown, add a category legend, increase important type sizes, and replace ambiguous toggles with explicit state-changing language.

#### P-08 — Workflow buttons look like unrelated pills — P2 / Medium

Problem: “Salva bozza”, “Pronto da compilare”, “Ho copiato su PoliMi”, and “Guida” look like one button group even though they represent different workflow stages.

Recommendation: Use a stepper or clear primary/secondary action hierarchy with the current stage visibly marked.

### Exams

#### E-01 — Filter selects have no accessible names — P1 / High

Problem: Both exam filters fail the accessible-name check.

Recommendation: Add visible or visually hidden labels such as “Anno” and “Stato”, correctly associated with each select, and group them in a labeled filter region.

#### E-02 — Filter bar lacks context and reset behavior — P2 / Medium

Problem: “Tutti gli anni” and “Tutti gli stati” appear without a clear filter heading or result context.

Recommendation: Add a “Filtri” label, result count, and “Reimposta filtri” when filters are active.

#### E-03 — Edit controls are too small and rows truncate information — P1 / High

Problem: Pencil controls are approximately 28px, while long course names are truncated on mobile.

Recommendation: Increase touch targets to at least 40–44px, provide tooltips or labels, and allow course names to wrap to two lines.

#### E-04 — Too many badges compete in exam rows — P2 / Medium

Problem: Status, effective/soprannumero state, and CFU metadata have similar visual emphasis.

Recommendation: Make exam status primary and present other metadata as smaller secondary text or expandable detail.

### Subjects and subject detail

#### S-01 — Subject detail has weak back navigation — P2 / Medium

Problem: The page uses only a circular arrow icon, without a breadcrumb or visible return label.

Recommendation: Add “Materie / Nome materia” or a visible “Torna alle materie” control with a 44px target.

#### S-02 — Internal navigation uses an external-link icon — P2 / Medium

Problem: “Vai agli esami” links to the internal /esami route but uses an external-link icon.

Recommendation: Use an internal arrow or chevron. Reserve external-link icons for URLs leaving the application.

#### S-03 — Empty asynchronous section is always displayed — P2 / Medium

Problem: “Lezioni da guardare” remains a full panel even when there are zero future recordings.

Recommendation: Collapse, hide, or combine the empty section with the backlog summary. Keep a CTA only when there is an actionable next step.

#### S-04 — Demo data exposes a likely course-code mismatch — P1 / High

Problem: The seeded Algoritmi subject is associated with code 085900, while the catalog identifies that code as Chimica Generale. The detail page can consequently show a misleading linked exam.

Recommendation: Verify and correct the seed/catalog association, add a regression test, and display “Nessun esame collegato” when the mapping cannot be validated. Do not show an incorrect course name as a confirmed relationship.

#### S-05 — Subject cards need stronger link affordances — P2 / Medium

Recommendation: Add arrows, clearer hover/focus treatment, and visible action labels consistently across dashboard, Materie, and subject detail.

### Settings

#### T-01 — Settings lacks a page-level title and structure — P1 / High

Problem: The page starts with an h2 inside a large card and leaves substantial unused space.

Recommendation: Add a page header and group content into sections such as “Dati locali”, “Dati di esempio”, and “Azioni pericolose”.

#### T-02 — Technical and destructive actions are too close together — P1 / High

Problem: Reset and seed actions are adjacent. “Seed” is technical language and its explanatory copy is visually weak.

Recommendation: Rename the action to “Carica dati di esempio”, isolate destructive actions in a danger section, and explain exactly what reset deletes.

#### T-03 — PWA installation is not discoverable on mobile — P3 / Low

Problem: If installation is intended, the feature is not exposed clearly on smaller screens.

Recommendation: Expose installation from Settings or another responsive location.

## Recommended implementation order

1. Fix accessibility and responsive blockers: headings, exam labels, popover positioning, calendar overflow, tablet Piano layout, and bottom-navigation overlap.
2. Establish shared visual primitives: PageHeader, surface hierarchy, focus states, touch targets, date formatting, and status components.
3. Simplify Dashboard and Piano information architecture.
4. Improve Calendar editor, exam rows, subject detail, and Settings.
5. Polish copy, icons, spacing, and empty states.

---

# Implementation prompt for an AI coding agent

You are a senior product designer and frontend engineer working in the Poliplanner repository.

Improve the complete UI/UX of the existing Next.js application based on the audit above. Preserve all existing functionality, routes, Server Actions, domain rules, SQLite behavior, plan validation, catalog data, and revalidation behavior. Do not redesign the product into a different application and do not remove existing capabilities.

## Repository constraints

- Next.js App Router, React, TypeScript, Tailwind CSS, and better-sqlite3.
- Follow AGENTS.md.
- Use existing UI primitives and Lucide icons where possible.
- Keep mutations routed through src/app/actions.ts.
- Do not introduce an ORM or unnecessary dependencies.
- Do not use broad layout revalidation.
- Do not import motion/react into the Piano lazy-panel path.
- Preserve user changes in the working tree.
- Use apply_patch for edits.

## Required changes

### 1. Shared shell and design system

Create or improve shared components for:

- PageHeader with consistent h1, subtitle, actions, spacing, and responsive stacking.
- Button variants with clear primary, secondary, danger, disabled, hover, and focus-visible states.
- IconButton with accessible labels, tooltips, and minimum 40–44px touch targets.
- StatusBadge and filter-chip styles with clearer hierarchy.
- Viewport-safe InfoPopover behavior.
- Consistent focus rings and keyboard navigation.

Reduce excessive pill styling. Use pills for statuses and filters, not every button and card. Strengthen the distinction between page background, cards, elevated panels, and inset content. Keep the existing dark palette unless a measured contrast or readability issue requires a change.

Add shared Italian date-formatting helpers and replace raw ISO dates in user-facing UI.

### 2. Navigation and responsive layout

Improve desktop and mobile navigation:

- Show the actual current destination on mobile, including Materie, Calendario, and Impostazioni.
- Make the Altro menu close on outside click and Escape.
- Manage focus when opening and closing the menu.
- Ensure fixed mobile navigation never covers content, including safe-area insets and nested scroll areas.
- Test at 320px, 360px, 390px, 480px, 768px, 900px, 1024px, and 1280px.
- Move the persistent private-instance footer to a lower-frequency location if it does not provide useful navigation context.

### 3. Page hierarchy

Add a proper h1 and page header to:

- /lessons
- /calendar
- /settings

Make the Piano heading consistent with the other primary pages. Keep the dashboard greeting as supporting content but provide clear page orientation.

### 4. Dashboard

Remove redundant information:

- Do not repeat the missing-exam count in both hero and KPI areas.
- Do not repeat the same date and weekday in multiple large tiles.
- Do not show the same completion percentage in several equally prominent forms.

Keep a compact Today block focused on actionable lessons and next activity.

Improve empty states:

- Distinguish “no calendar configured” from “nothing pending”.
- Avoid presenting virtual/generated progress as confirmed user progress.
- Add direct calls to action for configuring the calendar and creating a plan.

Make the progress chart accessible:

- Add a visible text legend and counts.
- Add an accessible summary for the chart canvas.
- Do not rely on color alone.

Improve subject progress cards with visible navigation affordances and clear hover/focus states. Prevent metric values from breaking across lines.

### 5. Lessons

- Add the missing page header.
- Use localized human-readable dates.
- Make mode badges visibly interactive when they can be changed.
- Replace or supplement the tiny three-dot actions button with a labeled action on wider screens.
- Add an undo toast or equivalent recovery affordance after marking a lesson complete.
- Allow long course names to wrap to two lines on mobile.

### 6. Calendar

Fix the mobile header so “Modifica calendario” never creates horizontal overflow. Stack or resize the action below the small breakpoint.

Correct the copy describing the week so it matches whether Saturday and Sunday are shown.

Improve the weekly grid:

- Avoid the awkward four-column layout with an incomplete second row.
- Use a coherent weekday/weekend layout.
- Avoid fixed minimum heights that create large empty areas.
- Format dates locally and de-emphasize technical course codes.

Add a clear primary CTA to the empty calendar state.

Improve the mobile schedule editor:

- Use collapsible schedule rows with concise summaries.
- Keep the active row expanded.
- Add a sticky save bar that remains above mobile navigation.
- Track dirty state and confirm before discarding unsaved changes.
- Preserve the existing save/cancel behavior and data model.

### 7. Piano di studi

Fix the tablet breakpoint. At approximately 1024px, do not show the full validation sidebar beside a cramped main plan. Collapse the sidebar below the main content or hide it until there is enough width.

On mobile, show a compact plan-status summary immediately below the header and current plan content. Keep detailed validation lower on the page.

Remove repeated success/status panels and consolidate them into one prominent status banner plus details.

Group advanced accordions under a secondary “Altre funzioni” area or provide in-page navigation. Keep every existing feature available.

Remove duplicate “Aggiungi un insegnamento” CTAs where possible.

Clarify first-run and virtual-plan states:

- Label generated content as “Proposta non salvata” or equivalent.
- Do not imply that a saved plan exists when it does not.
- Make the correct “Crea/Salva piano” action primary.
- Explain the difference between a proposal and an active plan.

Improve plan density:

- Increase important type sizes.
- Use one primary CFU total with a clear breakdown.
- Add a legend for category letters and provenance/status chips.
- Replace ambiguous “→ Soprannumero” labels with explicit state-changing language.
- Present workflow actions as a stepper or clear primary/secondary hierarchy.

### 8. Exams

- Add visible or visually hidden labels to both filter selects.
- Group filters under a labeled filter region.
- Add result count and reset-filter behavior.
- Increase edit-button touch targets.
- Add tooltips or labels for icon-only editing controls.
- Allow long course names to wrap on mobile.
- Reduce visual competition between status and secondary CFU/state badges.
- Add visible focus styles to selects and row actions.

### 9. Subjects and subject detail

- Add breadcrumb or visible back navigation.
- Replace the external-link icon on internal navigation with an internal arrow.
- Hide or collapse empty asynchronous-lesson sections when there is no actionable content.
- Add clear affordances to subject cards.
- Verify the demo seed mapping between subject names and course codes. In particular, ensure the Algoritmi/085900 association is correct relative to the catalog. Add a regression test and show no linked exam rather than an incorrect course name when validation fails.

### 10. Settings

- Add a page header and clearer grouped sections.
- Rename technical copy such as “seed” to user-facing wording.
- Separate destructive reset actions from demo-data actions.
- Explain exactly what reset deletes.
- Keep confirmation dialogs and existing data behavior intact.
- If PWA installation is supported, expose it responsively on mobile.

### 11. Modal and popover accessibility

For all dialogs and popovers:

- Support Escape.
- Close on outside click where appropriate.
- Trap focus inside modal dialogs.
- Return focus to the trigger after closing.
- Prevent background scrolling while a modal is open.
- Keep content within the viewport at mobile widths.
- Ensure all icon-only controls have accessible names.

## Validation requirements

Run:

- pnpm lint
- pnpm test:polimi
- pnpm build

Then perform browser verification on every primary route at 320px, 390px, 768px, 1024px, and 1280px.

Acceptance criteria:

- No horizontal overflow on any route.
- No content is hidden behind mobile navigation.
- Every primary page has exactly one useful h1.
- Exam filters have accessible names.
- The chart has a textual accessible alternative.
- Popovers remain inside the viewport.
- Mobile Altro navigation correctly identifies the active destination.
- Menu and dialog keyboard behavior works.
- Piano remains usable at 1024px.
- Piano status is visible near the top on mobile.
- Empty states distinguish missing configuration from zero activity.
- Date and course labels are readable without relying on tooltips.
- Existing functionality, actions, persistence, validation, and routes continue to work.
