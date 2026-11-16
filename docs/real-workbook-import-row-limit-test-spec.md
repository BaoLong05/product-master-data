# Real-workbook row-capacity test specification

Status: implemented; test-first evidence recorded below.

## Observed input

`C:\cv\Sample Input Form.xlsx` is 8,969,323 bytes. Its `DATA` worksheet has 13,281 populated data rows, 13 blank physical rows, 13,295 rows including the header, and 27 columns. It is below the 10 MiB upload limit and 20,000-row-position limit. It also contains 10,706 formula cells and 10 embedded images; formulas/caches are omitted and embedded images are outside the current import contract.

## Problem

Before this slice, the shared import reader and M.CODE scanner capped physical data-row positions at 10,000, preventing the supplied workbook from being fully validated or committed despite fitting the file and XML-part bounds. The implementation now caps the span at 20,000.

## Slice and safety boundary

Raise the bounded physical row-position limit to 20,000 so this workbook fits with headroom. Keep the 10 MiB upload bound, 100-column bound, cancellation checks, formula omission, repeated-M.CODE acceptance, and transaction/idempotency rules. This slice does not claim to preserve or import embedded drawing images; image ingestion remains a separate required design/implementation slice before claiming full-fidelity workbook import.

## Acceptance tests

| ID | Given / when | Then |
|---|---|---|
| RL1 | Commit a valid workbook with 13,281 populated data rows | The API returns Created, reports every populated row scanned/imported, and persists exactly that many records. |
| RL2 | Scan a worksheet whose physical data-row span matches the supplied workbook | M.CODE diagnostics complete and report the full span. |
| RL3 | Scan/import a workbook with 20,001 physical data-row positions | It is rejected with the stable `workbook_row_limit_exceeded` error; no partial validation or business writes occur. |
| RL4 | Read formula cells in the accepted range | Formula expressions and cached results remain omitted, consistent with existing tests. |

## Verification notes

- RED: before the implementation change, the new 11,816-row commit test returned HTTP 400 instead of the expected 201; the scanner test threw `WorkbookRowLimitExceededException` at the old 10,000-position guard.
- GREEN: after raising the shared limit, the focused import tests passed (5 passed), including a synthetic 11,816-row commit, 11,816-row-span M.CODE scan, and >20,000-row rejection with no writes.
- Cleanup: renamed the shared reader constant to describe its actual use by both import and M.CODE validation, updated both safe API error messages, moved boundary tests to 20,000/20,001, and reconciled import/schema/workbook documentation. No unnecessary code or abstraction was introduced.
- Full frontend build, lint, and tests passed (59 tests, 1,115 assertions). The aggregate `bun run check` reached the API build but could not overwrite DLLs held by running `ProductMasterData.Api` processes; no running process was stopped.
- Isolated .NET solution build passed with 0 warnings/errors. Full API suite passed 90 tests; 4 PostgreSQL provider tests were skipped because their dedicated test connection strings are not configured. `git diff --check` passed.
- Verification used generated workbooks matching the source row count; the supplied workbook was inspected but not committed to the local database. Embedded drawing-image import and full fidelity remain unimplemented.