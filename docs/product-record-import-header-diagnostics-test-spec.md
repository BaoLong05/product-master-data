# Product record import header diagnostics test specification

Status: implemented as client-side, read-only feedback in the existing worksheet preview. It does not change the API contract or authorize import.

## Purpose

Advance the existing read-only workbook preview toward explicit column mapping by showing which exact source headers are recognized, repeated, missing, blank, or unfamiliar. Diagnostics must not silently map a column or decide whether an import can proceed.

## Observable contract

- Analyze the selected worksheet's displayed header row against the 27 exact source headers listed in `docs/data-and-import.md`.
- Match source labels exactly as provided. Do not trim, case-fold, transliterate, alias, or otherwise normalize header text; a non-exact nonblank value is unfamiliar and must remain visible as-is.
- Mark every occurrence of a repeated nonblank header as duplicate. Blank cells are reported as blank columns, not as duplicate business fields.
- List source headers not present in the workbook as missing. These are informational diagnostics: because no source field is required, missing fields do not block preview or imply invalid product records.
- List nonblank headers that are not an exact known source header as unfamiliar. Do not discard them or assign them to a target field.
- Show recognized exact headers as recognized, but do not treat recognition as a saved mapping. Explicit mapping remains a later step requiring user selection.
- Keep the existing raw-row preview and formula hiding behavior unchanged.
- Diagnostics are client-side and read-only. They do not alter the workbook, API request/response, records, import batches, or audit events.

## Tests

1. Exact known source headers are recognized; absent source headers are listed as missing.
2. Every occurrence of a repeated known header is marked duplicate and its source field is not reported missing.
3. Non-exact nonblank headers are unfamiliar and preserved verbatim; blank headers are separately reported.
4. Recognition does not produce or persist a mapping; diagnostics never block or mutate the existing preview flow.
5. The rendered UI identifies recognized, duplicate, unfamiliar, blank, and missing-header conditions accessibly and explains that no mapping/import has occurred.

## Non-goals

- Automatic or user-selected column-to-field mapping.
- Header aliases, normalization, required-column policy, or import eligibility decisions.
- Cell-value/date/URL/duplicate-record validation, import confirmation, persistence, or audit changes.
- Changes to the protected preview API contract or Open XML parser.

## RED–GREEN–REFACTOR evidence

- RED: exact-header recognition initially returned an empty column list; duplicate-header coverage failed while repeated headers were not marked; the rendered-component test failed while its placeholder returned no markup. A further regression test exposed a misleading `2/27` count for two duplicate occurrences of one source field; the count now measures distinct recognized source fields.
- GREEN: focused diagnostics tests passed 4/4 with 20 assertions. Final `bun run check` passed with 8 frontend tests/62 assertions, frontend build/lint, .NET build (0 warnings, 0 errors), and API tests (65 passed, 3 PostgreSQL-gated skipped, 0 failed; 68 total).
- Cleanup: removed the no-op component scaffold, kept source-header data private while deriving the displayed denominator from it, and removed redundant CSS padding. Review found no remaining unused helper/import. Browser visual verification was not performed.
