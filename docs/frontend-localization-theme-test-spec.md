# Frontend localization and theme test specification

Status: required UI capability for the existing application. Preserve current API contracts, product-data values, CRUD/search/import/audit behavior, and user-entered form/filter state.

## Acceptance criteria

1. The application supports complete Vietnamese (`vi`), English (`en`), and Korean (`ko`) message catalogs. Every visible label, helper, accessibility name, status, error fallback, import-preview/mapping/diagnostic message, and audit-history string is localized.
2. A visible keyboard-accessible locale selector appears on both the sign-in screen and the authenticated shell. Switching locale updates UI copy and locale-aware date/count formatting without changing form values or issuing business API requests.
3. A visible accessible light/dark toggle appears on both surfaces. The saved choice persists across reloads; with no saved value, initial theme follows the OS preference. All application surfaces use semantic theme tokens and remain legible in both modes.
4. Locale/theme changes are presentation-only. They do not alter request payloads, stored product values, workbook values, permissions, or API contracts.
5. SaaS visual polish uses consistent semantic backgrounds, crisp borders, clear hierarchy and responsive controls without inventing product metrics, statuses, or unsupported workflows.
6. Existing login, catalog, CRUD, search/filter across all 27 source fields, Excel preview/mapping and audit behavior remain unchanged.

## Focused executable checks

- Verify all declared translation keys have non-empty Vietnamese, English and Korean values; verify interpolation, locale preference validation, theme preference initialization, and locale-aware date/count formatting.
- Verify theme CSS defines light and dark semantic canvas/surface/text/border/accent/status tokens; shared surfaces use tokens rather than hard-coded light-only colors.
- Verify both login and authenticated shell render locale/theme controls and translated UI hooks.
- Run focused tests, frontend build/lint/tests, then `bun run check`.
- Inspect 320–375px, 390–430px, tablet and desktop in both themes when browser access is available. If visual inspection is blocked, state that limitation rather than claiming it was performed.
