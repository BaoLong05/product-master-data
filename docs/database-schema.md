# Database schema design

Status: product catalog and local identity/permission persistence are migrated. PostgreSQL is the system of record. Import history and audit tables remain designed below and will be migrated alongside their application slices so no unused subsystems are shipped prematurely.

## Confirmed invariants

- A product record may have every source field missing.
- `M.CODE` is unique only when non-empty. NULL/empty values are allowed and do not collide.
- Duplicate import rows are skipped and reported with source row/reason; existing records are never overwritten.
- Local accounts are administered by application administrators.
- Preserve all 27 workbook source headers and values; identifiers remain text.

## Phase 1: `product_records`

One row represents one product/sample record. Use a UUID primary key independent of workbook row number. Preserve the exact source value for each spreadsheet field as nullable text in the initial migration. This avoids irreversible coercion of ambiguous dates, formula results, booleans, and localized number formats while the import parser/validation rules are not yet implemented. Typed interpretations can be added as nullable derived columns in later migrations without discarding original values.

Columns:

- `id UUID PRIMARY KEY`
- `date_value`, `company_name`, `item_name`, `m_code`, `item_code`, `product_type`, `product_status`, `approval_status`, `sample_or_production_order`, `company_name_letters`, `old_region`, `sample_saved_date`, `pic_image`, `purchase_order`, `production_order_pdf`, `note`, `printed_at`, `disc_name`, `soi`, `maso`, `denier`, `price`, `region`, `quantity`, `pic_url`, `internal_item`, `request`: nullable `TEXT`, mapped one-to-one to the source headers in `docs/data-and-import.md`.
- `created_at TIMESTAMPTZ NOT NULL`, `updated_at TIMESTAMPTZ NOT NULL`, both UTC.
- `is_deleted BOOLEAN NOT NULL DEFAULT FALSE` for future soft-delete behavior; no hard-delete API is implied.
- `version BIGINT NOT NULL DEFAULT 1` for optimistic concurrency.

Indexes/constraints:

- Partial unique index on `m_code` only where value is neither NULL nor the empty string. No case folding or trimming is performed by the database; source identifiers are preserved exactly. Import normalization policy must be decided before any trimming/case-insensitive matching is added.
- Index `(is_deleted, updated_at DESC)` for active-record listing.
- No other uniqueness constraints or required business fields.

## Implemented identity/permission tables

ASP.NET Core Identity supplies `AspNetUsers`, `AspNetRoles`, `AspNetUserRoles`, `AspNetUserClaims`, `AspNetRoleClaims`, `AspNetUserLogins`, and `AspNetUserTokens`. User/role entities and user-role assignments use GUID identifiers; ancillary Identity tables use the framework's standard key shapes. `AspNetUsers` contains an `IsActive` flag and Identity's password-hash field; it never stores plaintext passwords. `NormalizedUserName` is uniquely indexed. Email uniqueness/login semantics are not configured until the login identifier is confirmed. `AspNetRoles` has an `IsBuiltIn` flag.

`permissions` stores the 22 stable keys from `docs/authorization.md`; they are seeded once by migration. `role_permissions` has composite key `(role_id, permission_key)`, a foreign key to `AspNetRoles`, and a restrictive foreign key to the permission catalog. Role-to-user assignment uses Identity's `AspNetUserRoles` composite key. No user, role, or administrator is seeded by migration. Bootstrap/login exist; permission enforcement, last-admin protection, and role-assignment APIs remain unimplemented.

## Planned import and audit tables (not yet migrated)

1. `import_batches`: UUID ID, initiating user, safe source filename, content hash, status, started/completed timestamps and row counts. Do not retain original workbook by default.
2. `import_row_errors`: batch ID, source row number, optional source header, stable error code and safe message; do not persist raw cell values by default.
3. `audit_events`: append-only event ID, nullable actor for bootstrap/system actions, UTC timestamp, action, target, outcome, correlation ID and safe JSON metadata. No credentials or full spreadsheet rows.

Add import/audit tables and their foreign keys when those vertical slices are implemented and tested. Import commit, duplicate reporting, and audit policies remain enforced by application services; database constraints provide integrity, not authorization.

## Risks and follow-up decisions

- Dates, timestamp timezone, decimal precision/currency, enum vocabularies, field size limits, and key normalization are not inferred. Source strings remain untouched until those rules are confirmed and implemented with row-level validation.
- The first migration does not import workbook rows and does not auto-create any user.
- Migration application must be additive and must never drop/reset an existing local database volume.
