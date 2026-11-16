# Stitch company library UI adaptation test specification

> Historical scope: this records the first API-safe product-list adaptation. Current shell replacement acceptance is documented in `docs/stitch-ui-replacement-test-spec.md`.

Status: company directory and company-scoped item flow implemented and automated checks pass; browser viewport inspection remains unperformed.

## Intent
Adapt useful visual structure from `C:\Users\PC\Downloads\stitch_company_data_library_ui\code.html` to the authenticated Product Master Data application without porting static demo content or implying unsupported workflows.

## Source design assessment

Keep and adapt: restrained slate surfaces, compact brand/sidebar navigation, top-level preference/account controls, clear hierarchy for a company-and-item library, a dense but readable item table, contextual detail actions, and responsive layout. Do not copy the static HTML's fake companies/items/images/counts/storage usage/years/statuses, hard-coded identity, external image URLs, CDN Tailwind, inline event handlers, or unsupported actions.

The API exposes `GET /api/v1/companies` for a paginated directory and counts aggregated across active records, plus `GET /api/v1/records?companyNameExact=...` for exact parent-scoped item results. Company names remain source values; null and whitespace-only names are represented by one unassigned group. Record list items include `id`, `companyName`, `itemName`, `mCode`, `itemCode`, `productType`, `productStatus`, `purchaseOrder`, `picImage`, and `picUrl`; detail returns all 27 source fields. The API does not provide company IDs, year aggregation, or image assets extracted from Excel drawings. Preserve record detail, edit/delete/audit, create, import, auth, i18n, and themes.

## Acceptance criteria

| ID | Given / when | Then |
|---|---|---|
| S1 | Authenticated shell renders | Brand, actual Catalog and Import navigation, locale/theme controls, current identity, and logout are present; there are no invented navigation routes or fake metrics. |
| S2 | Authenticated user opens catalog | An accessible paginated company directory shows source company names and server aggregate item counts; selecting a company loads only that company's active records from the scoped API query. |
| S3 | Company items render | The existing photo-first gallery shows item identifiers and opens the existing full record-detail flow; a back control returns to the company directory. |
| S4 | Directory or item results are empty/loading/error | Localized loading, empty, and error states remain reachable and understandable. |
| S5 | Record detail and actions render | The existing full 27-field detail, edit/delete/audit actions, and import workflow remain intact. |
| S6 | Small viewport | Company directory and item gallery reflow without document-level overflow; controls remain keyboard accessible. |
| S7 | Design source unsupported elements | No static partner/year/status totals, exports, add-partner actions, external sample images, or fake image-quality/modal controls are introduced. |

## RED–GREEN–REFACTOR evidence

- RED: the focused company UI tests failed because the directory component/query helper did not exist; the API library test failed with 500 while an ordered grouped query could not be translated by the test provider. A whitespace-only company test then failed because it was counted separately.
- GREEN: directory component/query tests passed; API grouping and exact-scope test passed, including null/empty/whitespace-only group handling.
- Cleanup: extracted query building from the React component to remove the fast-refresh lint warning; removed an unnecessary wrapper and index-based list key; removed diagnostic response-body output to avoid leaking test headers if the assertion fails.
- Verification: `bun run check` passed: frontend build/lint and 80 web tests; .NET build passed; 91 API tests passed and 4 PostgreSQL provider tests were skipped. `git diff --check` passed. Responsive styles are covered by source-level checks; browser viewport inspection was not performed.
