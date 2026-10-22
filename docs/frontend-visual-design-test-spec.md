# Frontend visual design test specification

Status: style refinement for the existing React workspace; behavior, API contracts, and record/import workflows must remain unchanged.

## Design acceptance

- Login is a designed workspace entry: a high-contrast brand/story panel with a restrained, non-data decorative product illustration and a distinct credential panel on desktop, stacked cleanly on mobile. Keep the existing login API, labels, autocomplete, required fields, error feedback, and submit behavior.
- Use a shared, documented spacing scale in CSS custom properties. Layout `margin`, `padding`, `gap`, and outline offsets use the scale, not one-off pixel values; zero remains allowed for resets.
- Remove decorative gradients and heavy/drop shadows. Use a restrained teal accent, calm neutral surfaces, legible text, and crisp borders.
- Main content cards and the login card have generous internal padding. Desktop page sections use 96/128px top/bottom spacing and 48px between major sections; narrow viewports reduce the vertical whitespace while keeping the token scale.
- Base body text is at least 16px, secondary information remains readable, headings use a consistent scale and tight leading, and text never uses pure black/white in light mode.
- Buttons, links, disclosure summaries, and form controls have visible hover/focus/active/disabled states, with smooth ~200ms transitions and a subtle 1.01 button hover scale; reduced-motion preference is respected.
- On narrow screens, form/filter grids reflow, the shell fits the viewport, and wide tables scroll locally rather than forcing page-wide horizontal overflow.
- Existing sign-in, catalog CRUD/search/filter, Excel preview/mapping, and audit-history interactions are not altered.

## Automated checks

1. CSS defines every shared spacing token and spacing declarations do not contain unscaled non-zero pixel values.
2. Styles contain no decorative gradients or box-shadow effects; prominent cards use generous padding tokens.
3. Global typography and interaction-state rules are present.
4. Responsive breakpoints, local table scrolling, and reduced-motion support remain present.
5. Existing frontend tests, lint, production build, and full `bun run check` pass.

## Visual verification limitation

Inspect 320–375px, 390–430px, tablet, laptop, and wide desktop in a browser when browser approval is available. A successful build or HTTP 200 from Vite does not prove visual correctness. If browser access is unavailable, report that the viewport inspection was not performed.
