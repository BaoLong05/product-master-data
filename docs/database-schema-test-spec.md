# Product record schema test specification

Status: acceptance criteria for the PostgreSQL catalog and local identity/permission schemas.

## Database model contract

1. One `product_records` row has an application-generated UUID identity, independent of Excel row number.
2. All 27 source values are nullable and preserved as text until parser/date/time/number semantics are confirmed; no source field is required.
3. A non-empty `M.CODE` is unique. NULL and empty-string values are allowed to repeat. No case folding or silent trimming.
4. `created_at`, `updated_at`, `is_deleted`, and `version` are required system fields with explicit defaults/semantics.
5. Index active listing by `is_deleted, updated_at DESC`.
6. Migration can be applied to PostgreSQL without dropping or resetting existing data.
7. Local accounts/roles use ASP.NET Core Identity with GUID keys; normalized usernames are unique and password hashes only are persisted.
8. The permission catalog contains the 22 stable keys in `docs/authorization.md`; role grants use a composite key and foreign keys to roles and permissions.

## Automated acceptance cases

- EF model maps the record to `product_records` with all 27 nullable source fields.
- EF model includes the partial unique index on non-null, non-empty `m_code` and the active-list index.
- EF model maps Identity users/roles and the permission/role-permission schema; all 22 catalog entries are seeded.

## Local PostgreSQL verification

Apply the checked-in migrations with `bun run db:migrate`. Verify that PostgreSQL reports 32 product-record columns (27 source + ID + 4 system fields), the Identity and permission tables, 22 permission rows, both named catalog indexes, and both migration history rows. In a transaction that is rolled back, verify multiple NULL/empty `M.CODE` values are accepted and a duplicate non-empty value raises a unique-constraint violation. Do not reset/drop the developer database or named volume.
