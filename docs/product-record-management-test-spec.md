# Product record entry and browse test specification

Status: list/create and audited record editing are implemented as local-only vertical slices. Audit persistence rules are covered by `docs/product-record-audit-test-spec.md` and the update contract by `docs/product-record-edit-test-spec.md`; other mutations remain open.

## User workflow

An administrator signs in, views active product records, and creates a record while preserving the original spreadsheet values. The first delivery is a usable list/create workflow; edit, delete, search/filter, and Excel import remain later work.

## API contract

- `GET /api/v1/records` requires `records.read`, returns only non-deleted rows, ordered by `UpdatedAt` descending then `Id` ascending. `page` defaults to 1, `pageSize` defaults to 50 and must be 1–100. Response includes items, page, pageSize, and totalCount.
- `GET /api/v1/records/{id}` requires `records.read`; deleted or unknown records return 404.
- `POST /api/v1/records` requires `records.create` and a valid antiforgery token. It accepts all 27 source fields as nullable text, returns 201 and a resolvable Location.
- `PUT /api/v1/records/{id}` requires `records.update` and a valid antiforgery token. It replaces all source fields and requires the current `version`; stale versions return 409. Successful updates increment the version and append a `records.updated` audit event atomically.
- No source field is required. Null and empty `M.CODE` values are allowed. Non-empty `M.CODE` is preserved exactly and must be unique; a duplicate returns a safe 409 without overwriting either record. Whitespace/case normalization is not added.
- Anonymous callers get 401; authenticated callers without the needed permission get 403. Invalid/missing antiforgery tokens do not write records.
- Writes never evaluate formulas or fetch URLs; source values are stored as text.

## UI acceptance

- A signed-out user sees a username/password form and generic login failure messages.
- A signed-in user can browse the paged list, open the create form, save a record with optional fields, see success/error feedback, and return to the refreshed list.
- Authentication uses the existing secure cookie and antiforgery token flow; the UI does not store credentials or tokens in local storage.
- Layout remains usable on narrow screens; the wide record table scrolls within its own region rather than clipping the page.

## Executable coverage

- `User_with_record_permissions_can_create_and_retrieve_a_nullable_record` verifies create, nullable fields, and the returned resource location.
- `User_with_read_permission_can_browse_a_page_of_active_records` verifies default/explicit pagination and the persisted list response.
- `Anonymous_record_routes_return_unauthorized` checks list, detail, and create are inaccessible anonymously.
- `Create_without_create_permission_is_forbidden_and_does_not_persist` checks deny-by-default writes.
- `Create_without_antiforgery_token_is_rejected_without_persisting` checks CSRF rejection has no database side effect.
- `Duplicate_nonempty_m_code_returns_conflict_without_overwriting_the_existing_record` checks the duplicate response and original-value preservation.
- API integration tests use the test host's in-memory provider; PostgreSQL race behavior is not exercised by these cases.

## RED–GREEN–REFACTOR evidence

- RED: the initial create route test received 404; after adding create/detail, the collection test received 405 because GET was not mapped.
- GREEN: creation/detail test passed 1/1; after list implementation, focused record tests passed 2/2; final focused record API suite passed 6/6.
- Cleanup: reused a shared authenticated-client/CSRF test helper; inspected route, DTO, test, and UI changes for dead code. Removed starter-app imports/references and external font requests. Corrected a UI request key mismatch (`date` → `dateValue`) after the 27-field parity check failed; the normalized UI/API comparison then passed 27/27.
- Full validation: `bun run check` passed after all code edits: frontend build/lint passed; .NET build had 0 warnings and 0 errors; API suite discovered 41 tests, 40 passed, 0 failed, 1 skipped. The skipped test is the optional PostgreSQL permission-provider test because `PRODUCTMASTERDATA_TEST_POSTGRES` was not configured. Product-record integration tests use the in-memory provider; PostgreSQL race/index behavior remains unverified.
- Visual verification: not performed because the browser harness required user approval for Chrome remote debugging; do not treat responsive layout as visually confirmed.

## Out of scope

Record deletion, search/filter/sort controls, role/user administration, full import workflow, typed parsing, audit-history UI, and exposing the app to LAN/internet. Do not invent max lengths or mandatory fields without an approved rule.
