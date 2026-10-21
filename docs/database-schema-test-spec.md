# Product record schema test specification

Status: acceptance criteria for the initial PostgreSQL catalog schema.

## Database model contract

1. One `product_records` row has an application-generated UUID identity, independent of Excel row number.
2. All 27 source values are nullable and preserved as text until parser/date/time/number semantics are confirmed; no source field is required.
3. A non-empty `M.CODE` is unique. NULL and empty-string values are allowed to repeat. No case folding or silent trimming.
4. `created_at`, `updated_at`, `is_deleted`, and `version` are required system fields with explicit defaults/semantics.
5. Index active listing by `is_deleted, updated_at DESC`.
6. Migration can be applied to PostgreSQL without dropping or resetting existing data.

## Automated acceptance cases

- EF model maps the record to `product_records` with all 27 nullable source fields.
- EF model includes the partial unique index on non-null, non-empty `m_code` and the active-list index.

## Local PostgreSQL verification

Apply the checked-in migration with `bun run db:migrate`. Verify that PostgreSQL reports 32 columns (27 source + ID + 4 system fields), both named indexes, and the migration history row. In a transaction that is rolled back, verify multiple NULL/empty `M.CODE` values are accepted and a duplicate non-empty value raises a unique-constraint violation. Do not reset/drop the developer database or named volume.
