# Responsive viewport test specification

## Scope

Verify the global header/preferences, login, catalog toolbar/search/filter/pagination, record form, import previews, audit panel, and dense tables. Keep all API and permission behavior unchanged.

## Viewport matrix

| Range | Representative CSS widths | Required checks |
|---|---|---|
| Narrow phones | 320, 360px | header/control wrapping, 27-field forms, button reachability, pagination, no document-level horizontal overflow |
| Typical phones | 390, 430px | login stack, cards, touch targets, local table scrolling, long translated labels |
| Tablet | 768, 1024px | header fit, two-column forms/filters where appropriate, table wrappers, vertical scrolling on 568–640px height |
| Laptop | 1280, 1440px | readable main-column width, centered content, no stretched forms |
| Wide desktop | 1600px+ | max-width behavior and restrained line lengths |

## Automated acceptance checks

- Test the CSS contract for content-driven breakpoints, header wrapping, mobile pagination reflow, shrinkable content columns, bounded table scrolling, and max-width behavior.
- A CSS contract test is not a substitute for a browser viewport run; report browser verification separately.
- Run the frontend unit/lint/build checks and root `bun run check` after the responsive changes.
