# Data and Excel import

Status: proposed based on inspection of `Sample Input Form.xlsx`; key and duplicate rules confirmed by the user. Remaining type, field-length, and normalization decisions must be confirmed before schema/API implementation.

## Observed workbook

One sheet named `DATA`, table `Form_Responses`, 27 columns, approximately 9,986 rows. The content contains Vietnamese, English, and Korean text; strings/codes, date-like values, booleans, blanks, notes, image formulas, and Google Drive URLs. Some cells in column L have date formatting but integer serials outside valid date bounds; these require explicit row errors and must not be silently converted to dates.

## Source columns

The initial import contract should account for all source headers exactly as they appear:

1. Date
2. Tên Công Ty
3. Item Name
4. M.CODE
5. Item Code
6. Product Type
7. Status SP
8. KH Duyệt
9. Lệnh Sample/SX
10. Tên Công Ty Chữ Cái
11. Khu vực cũ
12. Ngày lưu mẫu
13. PIC (Hình)
14. PO
15. Lệnh SX (PDF)
16. Note
17. Đã In (Ngày giờ)
18. Tên Đĩa
19. SOI (실)
20. MASO (실넘버)
21. DENIER
22. Giá
23. Khu vực
24. Số Lượng
25. PIC URL (text)
26. Internal Item
27. Request

Keep source labels and raw values available for traceability. Do not assume a spreadsheet row index is a durable record ID.

## Decisions required before production schema

- `M.CODE` is the unique key when present. Because records may be saved with fields missing, a blank/null `M.CODE` is allowed and is not treated as a duplicate key; enforce uniqueness for non-empty values and use it to detect existing records and duplicates within an import batch.
- Required columns and valid domain values for product type/status/region/approval.
- No source field is required to save a record; records may contain missing fields. Apply type/length validation independently of requiredness.
- On duplicates, skip the affected row, report its source row number and reason, and never overwrite an existing record. Apply consistently to records already stored and repeated keys within a single import.
- Preserve all 27 columns as typed fields, or normalize some into related entities.
- How to interpret date-only and local date/time fields; blank, malformed and out-of-range values.
- Whether to retain original uploaded files and for how long.

Do not invent other unique constraints, destructive upsert behavior, mandatory fields, or data deletion policy.

## Safe import flow

1. Accept only `.xlsx`, enforce file size, row/column, worksheet and processing time bounds. Store temporary files outside public web roots and clean them up.
2. Parse workbook data as values. Never evaluate formulas, macros, external references or links. Treat formulas in `PIC (Hình)`/`PO` as untrusted; do not execute or fetch them. Capture a supported URL only as text if present.
3. Select worksheet, inspect header row, flag duplicate/missing/unrecognized headers, map columns explicitly, and show a bounded preview.
4. Validate each row: type conversion, required values once agreed, maximum lengths, boolean/number/date parsing, URL scheme and duplicate candidates. Keep identifiers as strings so leading zeros survive.
5. Show counts and row/column errors before commit; allow error report download. Preview must not write business records.
6. Require explicit `imports.commit` authorization and user confirmation. Apply the agreed dedupe policy with idempotent behavior and transaction semantics. Record summary and audit event.
7. Store only necessary metadata; default to deleting temporary workbook after processing unless retention is approved.

Imported links are never fetched server-side: avoids SSRF and unexpected external data transfer. Render spreadsheet text as text (not HTML); allow only safe clickable URL schemes in the client.

## Date and value handling

Do not rely on display formatting alone to decide a cell's semantic type. Preserve raw source representation where useful. Distinguish Excel serials from typed date cells and validate serial bounds. Reject/flag invalid values; do not silently substitute current dates, zeroes, or empty strings. Use decimal for prices; do not treat identifiers or codes as numbers.
