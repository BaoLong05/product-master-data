# Product record import column mapping test specification

## Purpose

Add the explicit, user-visible column-to-field selection step required by the safe Excel import flow. The existing preview API already returns bounded raw rows; mapping remains client-side and must not start an import.

## Observable contract

- For each header in the selected worksheet, show a labeled target-field selector with “Không ánh xạ” selected initially. Never preselect a target from header recognition or column position.
- Offer the existing 27 product-record fields as targets, using the same field definitions as record create/edit/search. A target field may be assigned to at most one workbook column at a time; fields assigned elsewhere are unavailable, and the current assignment can be cleared or changed.
- Keep mapping choices only in current UI memory. Reset them when the workbook or worksheet changes. Do not send mappings to the API, browser storage, or server, and do not alter the existing preview request/response.
- When bounded raw rows are available and at least one column is mapped, show a separate mapped preview with target-field labels, source row numbers, and the selected source values in workbook column order.
- Preserve values as text. Formula cells and cached results remain hidden even if a test fixture supplies a non-null value at a formula position. Do not infer dates/numbers, validate, mutate rows, or treat preview as import.
- Keep the original raw-row preview available. Show a clear empty/waiting state if no columns are mapped or sample rows have not been loaded.
- No workbook, product record, import batch, or audit write is performed.

## Tests

1. Mapping starts empty; recognized header names do not create implicit assignments.
2. Valid target selections can be assigned, changed, and cleared; invalid fields/columns and a field already used by another column are rejected without changing the mapping.
3. Available target choices exclude assignments made to other source columns while retaining the current column's own selection.
4. Mapped preview includes only explicitly mapped columns in source-column order, preserves source row numbers and raw text, and masks formula values.
5. Rendered selectors are labeled, default to “Không ánh xạ”, explain temporary/no-import behavior, and show a mapped preview only when it can be meaningfully produced.
6. Changing workbook or worksheet clears mapping selections; the existing upload/API contract and raw preview remain unchanged.

## Non-goals

- Automatic or saved mappings, API/database changes, import eligibility rules, or commit.
- Row validation/coercion, duplicate-record handling, required fields, date/number semantics, or error reports.
- Import history, uploaded-file retention, audit changes, or workbook modification.

## Decisions for this preview-only step

- Each product target can be mapped from at most one source column at a time, avoiding ambiguous overwrite semantics in the preview.
- Unmapped columns remain visible and selectable; no required mapping is imposed because all product fields are optional and import eligibility is not decided here.
