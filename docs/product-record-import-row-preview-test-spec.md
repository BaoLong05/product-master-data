# Selected worksheet and bounded row preview — test specification

Status: implemented as a read-only extension of the existing workbook preview. No product records, import batches, uploaded files, or audit events are written or retained.

## Observable contract

- Reuse `POST /api/v1/imports/preview`, authentication, `imports.preview`, CSRF, `.xlsx` validation, and existing upload limits.
- Without multipart `worksheetName`, preserve the prior response: all worksheet names and first-row headers, without data rows.
- With an exact `worksheetName`, return only that worksheet, its first-row headers, and up to the next 10 worksheet rows with Excel row numbers. Values remain raw text; do not infer dates/numbers or evaluate formulas/cached results/links.
- Pad values and headers to the same width. Formula cells have null values and are identified by 1-based column positions; neither formula text nor cached values are exposed.
- Unknown sheet names return a safe HTTP 400 error. The selected preview remains stateless and performs no business/audit writes.
- The React screen lets users select a sheet, inspect its headers, and separately request/display up to 10 raw rows. Text is rendered as text; the sample is not validation or import.

## Focused executable cases

- Multi-sheet workbook selection returns only the selected sheet, with first 10 rows from a synthetic 45,000-row worksheet.
- Formula cell cached value and formula text are omitted; its column is marked.
- Unknown sheet name is rejected with the documented safe error; the existing no-selection response remains covered.
- No product records or audit events are written by selected-sheet preview.
- Frontend request helper includes the optional sheet field while preserving same-origin credentials, CSRF header, and browser-generated multipart boundary.
- Existing import preview auth/CSRF/type/size/malformed-workbook behavior remains covered by the API test suite.

## RED–GREEN–REFACTOR evidence

- API RED: selected-row test failed because the response had no rows (`NullReferenceException` at the `Rows` assertion), proving the missing behavior.
- API GREEN: focused `ImportPreviewEndpointTests` passed 11/11.
- Frontend RED: helper test expected `worksheetName = "Inventory"` but received `null`.
- Frontend GREEN: focused helper tests passed 2/2 (8 assertions).
- Cleanup: replaced a test-fixture ZIP rewrite with a formula-aware workbook fixture; generalized a parser error message from “header cell” to “cell”; aligned the UI sample-table indentation. No unused helper/import remained.
- Final `bun run check`: frontend build/lint passed; 4 frontend tests/42 assertions passed; .NET build succeeded with 0 warnings/0 errors; API tests 65 passed, 3 PostgreSQL-gated tests skipped, 0 failed (68 total).
- `dotnet format ProductMasterData.slnx --verify-no-changes --no-restore`, NuGet vulnerability scan, and `git diff --check` passed.
- Browser visual verification was not performed; the original workbook is not available in the repository.
