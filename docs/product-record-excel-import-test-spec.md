# Excel import feature test specification

Status: approved baseline / implementation in progress; full local and PostgreSQL-backed checks pass

## Actor and outcome

An authenticated import operator previews an `.xlsx` workbook, selects a worksheet, explicitly maps any source columns to product fields, commits the mapped rows after confirmation, sees which rows were imported or skipped, and can review persisted import history.

## Scope

In scope: complete-file structural parsing, explicit column mapping, duplicate `M.CODE` handling, transactional record creation, idempotent replay, import-batch/error persistence, safe audit metadata, import history API/UI, and localized user feedback.

Out of scope: typed/date/decimal/enum/URL interpretation, required-field rules, workbook retention/download, overwrites/upserts, hard deletion, automatic header mapping, formula evaluation, URL fetching, and deployment beyond the local application.

## Confirmed data rules

- All 27 source fields remain nullable text. Preserve literal cell text without trimming, case folding, date/number conversion, or URL fetching.
- No product field is required; rows may be partially or entirely empty. Unmapped fields are stored as `NULL`.
- Mapping is explicit and one-to-one. Mapping may omit any target, including `M.CODE`; a missing/blank `M.CODE` is permitted.
- Formula cells and cached formula results are untrusted and are treated as absent values.
- Non-empty `M.CODE` is unique by exact string, including values on soft-deleted rows. If a key already exists or occurs more than once in this workbook, skip every row in that duplicate group; do not select a winner or overwrite a record.
- Exact repeat of the same actor + workbook bytes + worksheet + mapping is idempotent and returns the original batch outcome without re-creating records.
- Record writes, batch summary, safe row errors, and one audit event commit atomically. A database failure leaves none of those effects behind. A concurrent uniqueness race fails the whole batch safely rather than partially importing or overwriting.
- Error/report/history DTOs contain source row numbers and stable reason codes, never raw source values or M.CODE values. Audit metadata contains identifiers and counts only.

## HTTP contract

| Route | Request | Permission | Expected result |
|---|---|---|---|
| `POST /api/v1/imports/commit` | multipart `file`, exact `worksheetName`, JSON `columnMapping` keyed by one-based column number; antiforgery header | `imports.commit` | first commit 201 with batch summary; idempotent replay 200 with original summary |
| `GET /api/v1/imports/history` | bounded `take` (default 20, maximum 100) | `imports.read` | newest-first batch summaries |
| `GET /api/v1/imports/history/{batchId}` | UUID | `imports.read` | batch summary and safe row issues; 404 for unknown batch |

Transport errors use safe stable `{code,message}` responses. Commit rejects missing/empty/unsupported/malformed/oversized workbooks, missing worksheet, invalid worksheet, malformed/duplicate/unknown column mapping, and rows beyond the established 10,000-position bound. Authentication, authorization and antiforgery are checked before workbook processing.

## Acceptance tests

| ID | Given / when | Then | Test layer |
|---|---|---|---|
| A1 | Authorized operator commits a workbook with mapped source values | All mapped values persist byte-for-byte as text; unmapped values are NULL; response counts match; one batch and one audit event persist | API + database |
| A2 | File contains repeated non-empty M.CODE or a key already stored, including soft-deleted | Every affected row is skipped and reported with row number/reason; unrelated and blank-key rows import; existing records are unchanged | API + database |
| A3 | Formula cell has a cached value | Neither formula nor cache is stored or considered a duplicate | API + database |
| A4 | Same actor commits exact same bytes/sheet/mapping again | Same batch/outcome is returned; no duplicate records, batch, or audit event is created | API + database |
| A5 | User is anonymous, lacks `imports.commit`, or omits/invalidates antiforgery | Request is rejected before parsing/writes; no records/batch/audit rows | API integration |
| A6 | Mapping JSON is malformed, references an absent column/unknown field, or assigns a target twice | Stable 400 error; no persistence effects | API integration |
| A7 | Import history is requested by an unauthorized user or for an unknown batch | 403 or 404 respectively; no protected details leak | API integration |
| A8 | Persistence fails after some candidate rows are prepared | Transaction leaves no product records, batch, row issues, or audit event | PostgreSQL integration |
| A9 | UI user previews/maps, confirms commit, receives mixed result, and revisits history | Loading, confirmation, summary, row reasons, empty/error history states are understandable and localized; no source values are displayed in issue details | Frontend workflow |
| A10 | Workbook exceeds file/worksheet/column/XML/row bounds or request cancellation occurs | Safe rejection/cancellation; no writes | API + reader tests |

## RED–GREEN–REFACTOR evidence

- RED: on resuming this slice, the first `bun run check` failed because the commit/history state and UI components were disconnected (unused imports/state in `App.tsx`). The focused interaction/view tests were then run after wiring; a dedicated behavioral RED was not captured before editing, so strict RED evidence for that UI slice is incomplete.
- GREEN: focused frontend interaction/view tests passed (6 tests); full `bun run check` passed against the running PostgreSQL service (frontend 49 tests; API 91 passed, 0 skipped).
- Cleanup: removed the unused detail-view import, fixed import-history effect dependencies/warnings, corrected confirmation copy to describe the server's 10,000-row bound rather than the 10-row preview; reran full checks with no frontend lint warnings.
- `git diff --check`: passed. All 4 provider-backed tests ran successfully using temporary, isolated disposable databases (`import_validation_test`, `audit_test`, `permission_test`, `search_test`); the temporary role and databases were removed afterward. Docker's original `product_master_data` database was left untouched.
- Original supplied workbook is not in the repository; synthetic fixtures cannot establish compatibility with every OpenXML feature.
