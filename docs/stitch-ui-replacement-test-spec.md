# Stitch UI Replacement — Test Specification

## Scope
Replace the legacy Product Master Data presentation shell with a React implementation inspired by `C:\Users\PC\Downloads\stitch_company_data_library_ui\code.html`. The reference's slate surfaces, compact collapsible navigation, top search/header, restrained borders, and responsive layout are the visual direction. Keep current API-backed workflows and data model.

## API/UI constraints
- The API exposes paginated product records, not a complete company directory, global per-company counts, year aggregates, or company-scoped item endpoints. The main screen must remain a record-oriented catalog; do not group a single page into fabricated company cards or show inferred totals/year/status badges.
- List rows may show only list DTO fields. The detail endpoint supplies the complete 27 source fields.
- Keep existing authenticated create/edit/soft-delete, 27-field search/filter, record detail, record audit history, Excel preview/mapping/validation/commit, and import history workflows.
- Navigation may expose only supported screens (catalog and Excel import). Do not add reference-only exports, approval/PO/label screens, role labels, notification counts, or storage metrics.
- Keep Vietnamese, English, and Korean labels; light/dark themes; keyboard-accessible controls; localized empty/loading/error states.

## Acceptance tests
1. The authenticated app uses the new `vault-*` shell, sidebar, and top-bar search; old `library-shell`/`login-layout` frames are removed.
2. Sidebar collapse/mobile navigation is operable and has explicit accessible state/labels; mobile focus enters the drawer on open, the backdrop is excluded from the tab sequence, Escape closes the drawer, and focus returns to its toggle; only supported catalog/import destinations are rendered.
3. Header search updates the text query without applying field-filter drafts; field filters are submitted separately, the active-filter count and translated search hint remain visible, and the existing 27-field catalog query/pagination stay connected. No fake company/year directory is rendered.
4. All supported record, audit, and Excel import workflows remain reachable in the new shell.
5. The layout reflows at narrow widths, keeps wide tables locally scrollable, honors reduced motion, and retains light/dark semantic tokens.
6. Locale/theme controls remain present on sign-in and authenticated shells; stored records and API contracts remain unchanged.

## TDD evidence
- RED: initial shell tests failed before replacement; the follow-up header-search test failed while both search surfaces shared one handler, the mobile-drawer test failed without a non-tabbed backdrop/Escape close, and visible-hint/detail-state tests failed before the final markup conditions.
- GREEN: the focused UI group passed 29 tests. Final `bun run check` passed: 74 frontend tests across 23 files, frontend build/lint, .NET build (0 warnings/errors), and 90 API tests; 4 PostgreSQL provider tests were skipped.
- Cleanup: separated header text search from field-filter submission, kept the active-filter count visible, reused the existing localized hint visibly with a valid `aria-describedby` target, and removed no-longer-needed hidden duplicate hint markup. Mobile Escape close reuses the existing focus-return helper. The earlier color-token audit reported no undefined or unused tokens. `git diff --check` passed.
- Runtime: frontend root and transformed `App.tsx`, `App.css`, and navigation modules returned HTTP 200; backend readiness returned HTTP 200.
- Visual verification: not performed. Browser remote-debugging approval was unavailable, and the desktop refresh action timed out awaiting approval; do not infer viewport correctness from build or HTTP status.
