# Read-only M.CODE duplicate validation — API test specification

Status: approved for the selected duplicate-validation slice

## Goal and actor

- API outcome: after explicitly selecting a worksheet and mapping one source column to `M.CODE`, an import operator can identify source rows whose exact `M.CODE` already exists or is repeated in the selected worksheet. Client UI integration is out of scope for this slice.
- Actor: authenticated user with both `imports.preview` and `records.read` permissions.
- This is validation only; it does not make rows importable or commit them.

## Scope

### In scope

- `POST /api/v1/imports/validate` accepts multipart `file`, required exact `worksheetName`, and required one-based `mCodeColumnNumber` selected by the user.
- Stream the selected worksheet, scanning at most 10,000 physical data-row positions after its header. Omitted row numbers between the header and a later explicit row count toward the bound and `scannedRows`; reject the entire request if the span exceeds that bound and never return partial validation results.
- Return the selected worksheet name, scanned data-row count, duplicate-row count, and source row numbers with stable issue code `duplicate_m_code`. Do not echo M.CODE values.
- Detect a duplicate when a non-empty exact M.CODE matches any stored record (including soft-deleted rows, consistent with the database unique index) or occurs more than once in the selected worksheet. For an in-workbook duplicate group, report every row in the group; report at most one issue per source row.
- Match exact source strings: do not trim, case-fold, convert, or normalize. Ignore null/empty values and formula cells (including cached formula values); whitespace-only strings remain values, consistent with the current database invariant.
- Reuse the existing `.xlsx` upload limit (10 MiB), 20-sheet and 100-column bounds. Bound XML parsing at 20,000,000 characters per part for the full-sheet scan and check request cancellation while streaming.
- Reject out-of-order/duplicate row coordinates, row numbers outside Excel's 1,048,576-row range, duplicate cell columns in a row, and cell references that do not match their containing row.
- Require authentication, both `imports.preview` and `records.read`, and a valid antiforgery token before application parsing.
- Do not retain the workbook or write product records, import batches, or audit events.

### Explicitly out of scope

- Type/date/length/required-field validation, URL validation, import commit/history/cancellation, error-report download, frontend integration, row eligibility decisions, and workbook retention.
- Hard wall-clock guarantees beyond request cancellation and the documented byte/XML/row bounds.

## HTTP contract

| Method and route | Request/filters | Success response | Permission/scope |
|---|---|---|---|
| `POST /api/v1/imports/validate` | multipart: `file`, exact `worksheetName`, one-based `mCodeColumnNumber` | `{ worksheetName, scannedRows, duplicateRows, issues: [{ rowNumber, code }] }` | authenticated; requires `imports.preview` AND `records.read`; valid antiforgery token |

Top-level input failures use safe `{ code, message }` errors: `invalid_antiforgery_token`, `missing_workbook`, `workbook_too_large`, `unsupported_workbook_type`, `invalid_workbook`, `missing_worksheet`, `invalid_m_code_column`, and `workbook_row_limit_exceeded`. Row issues use `duplicate_m_code`; they contain only the source row number and code, never the source key.

## Acceptance behaviors

| ID | Given | When | Then | Test layer |
|---|---|---|---|---|
| A1 | A valid selected sheet has repeated non-empty M.CODE values | Validate with the explicitly mapped one-based column | All rows in each repeated group are reported once with their Excel row numbers | API integration |
| A2 | A workbook M.CODE matches an existing product record | Validate | The matching source row is reported; no key is echoed | API integration |
| A3 | M.CODE values are null/empty, formula cells, or differ only by case/whitespace | Validate | Empty/formula values are ignored; values are compared exactly without normalization | API integration |
| A4 | A sheet/mapping/file is absent, invalid, malformed, or exceeds a documented bound | Validate | A safe stable error is returned and no partial result is reported | API integration |
| A5 | Caller is anonymous or lacks either required permission | Validate | 401/403 is returned before workbook processing | API integration |
| A6 | Caller omits/invalidates antiforgery | Validate | Request is rejected before parsing | API integration |
| A7 | A valid request contains duplicates | Validate | Product records and audit events are unchanged; uploaded file is not retained | API integration |
| A8 | Request is cancelled while rows are streamed | Validate | Cancellation propagates; no persistence side effects occur | Scanner/API integration |

## RED–GREEN–REFACTOR evidence

- RED: the first focused `Duplicate_m_codes_in_workbook_return_exact_source_rows_without_echoing_keys` endpoint test failed while the validate route was not mapped. Later scanner regressions reproduced sparse-row undercounting and acceptance of mismatched cell coordinates; the first out-of-range-row run exposed a non-expandable test fixture, which was corrected before GREEN.
- GREEN: the scanner-focused run passed 5/5 tests. `dotnet test tests/ProductMasterData.Api.Tests/ProductMasterData.Api.Tests.csproj --no-restore --logger 'console;verbosity=minimal'` completed with 82 passed, 3 skipped, 0 failed (85 discovered); this includes sparse-row boundaries, malformed coordinates, duplicate-workbook, existing-record, permissions, antiforgery, formula, shared-string, row-limit, mapping, and cancellation cases.
- Cleanup after GREEN: reviewed the scanner, endpoint, tests, and documentation; validation now reuses the upload's backing byte array where possible instead of copying the whole workbook again. A full check exposed that the localization edit had removed the English `notice.saved` entry; it was restored before the earlier successful full check.
- Final `bun run check`: passed. Frontend build and lint passed; 42 frontend tests passed (869 assertions); .NET solution build passed with 0 warnings/errors; API tests passed 82, skipped 3, failed 0 (85 total).
- PostgreSQL evidence: the full run skipped the existing three PostgreSQL-dependent tests because the dedicated test databases were not configured. There is not yet a PostgreSQL-provider test specifically exercising the duplicate-validation `Contains` query; real-provider query translation remains unverified.
- Unverified/deferred: the supplied source workbook is not present in the repository; actual PostgreSQL execution of this endpoint query remains unverified; frontend integration and broader typed row validation/commit are out of scope.
