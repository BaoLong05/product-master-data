# Excel workbook inspection preview — test specification

Status: implemented as a stateless structural inspection slice; no import batch persistence or record writes are implemented.

## Observable contract

- `POST /api/v1/imports/preview` accepts one `.xlsx` multipart field named `file` and requires an authenticated principal with `imports.preview` plus a valid antiforgery token.
- A supported workbook returns worksheet names and a bounded list of the first-row header values for each worksheet. Values are read as text; formulas are never evaluated or fetched. No business records, import history, or audit events are written.
- Upload size is capped at 10 MiB. Wrong extensions, missing/empty files, and malformed workbooks receive structured HTTP 400 errors; ASP.NET Core may reject requests that exceed multipart/request limits with HTTP 413 before the endpoint runs.
- Anonymous requests receive 401; authenticated users without `imports.preview` receive 403. Missing/invalid CSRF tokens do not process the upload.
- The UI lets a signed-in operator choose an `.xlsx`, inspect sheet/header output, view exact source-header diagnostics, and safely report errors. Header recognition itself is not mapping. The separate client-side mapping step is specified in `product-record-import-column-mapping-test-spec.md`; neither step implies row validation or import/commit is available.

## Scope and limits

- This slice is stateless: the upload is processed in-memory/request buffering only, not retained.
- It only inspects worksheet names and first-row headers (at most 20 worksheets and 100 columns per worksheet); it does not create records or batches.
- `.xls`, `.xlsm`, CSV, formula evaluation, URL fetching, mapping interpretation by this endpoint, row validation, duplicate resolution, commit, error downloads, and import history are out of scope. The separate row-preview slice adds a bounded raw sample only; the separate mapping UI can project that sample but is not validation or import.
- The parser must use the maintained Open XML SDK, read-only mode, a bounded XML-part size, and must not evaluate formulas or external links.

## Focused executable cases

- A permitted operator can inspect a valid multi-sheet workbook and receives its worksheet names/headers without any record or audit write.
- Anonymous and missing-permission requests are denied.
- Missing antiforgery token, non-`.xlsx`, empty, malformed, and oversized uploads are rejected. A synthetic workbook with 45,000 trailing data rows confirms the preview reads headers without loading all rows.
- Not yet covered by executable tests: invalid-but-present CSRF token, maximum worksheet/header boundaries, ZIP-bomb variants, and the original sample workbook.

## RED–GREEN–REFACTOR

- RED: the initial focused API test run exited non-zero before the endpoint existed; the first run's exact HTTP status/body was not retained, so no status is claimed. The large-sheet test also exited non-zero before the streaming-reader revision; its initial response details were not retained.
- GREEN: the valid multi-sheet workbook test passed after endpoint/parser implementation; replacing full worksheet DOM loading with `OpenXmlReader` made the 45,000-row fixture pass. API preview tests: 9 passed, 0 failed; frontend multipart-request test: 1 passed.
- Cleanup: removed redundant column-limit checking and an unnecessary frontend assertion; reviewed the endpoint, parser, API composition, UI, test fixtures, and docs for dead code. No database schema or persistence changes were needed.
- Final full verification: `bun run check` passed; frontend 3 tests/40 assertions, .NET build 0 warnings/0 errors, API 63 passed and 3 PostgreSQL tests skipped (66 total). `dotnet format --verify-no-changes`, NuGet vulnerability audit (no vulnerable packages across the solution), and `git diff --check` passed. Browser visual verification was not performed.
