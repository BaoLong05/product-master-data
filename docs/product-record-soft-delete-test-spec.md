# Product record soft-delete test specification

Status: implemented as a local-only removal action. It is recoverable by database-level intervention, but there is no user-facing restore workflow. It never physically deletes record data.

## API contract

- `DELETE /api/v1/records/{id}?version={version}` requires `records.delete` and a valid antiforgery token.
- The target must be active and the supplied version must match. Unknown/already deleted IDs return 404; stale versions return 409 without changes.
- Success marks the record deleted, increments version/UpdatedAt, returns 204, and writes one `records.deleted` append-only event atomically. Metadata contains only record ID and version numbers.
- Deleted records disappear from list and detail. Their database row and all source values remain. Existing M.CODE uniqueness is retained for deleted rows; this slice does not release or reuse a deleted code.
- Anonymous, missing-permission, and missing-CSRF requests do not mutate record/audit state.

## UI behavior

- The catalog row has a remove action with a clear confirmation before sending the request.
- Successful deletion refreshes the current page; errors preserve the row and show safe feedback.
- The button may be visible without `records.delete` because the current client has no effective-permission contract; the API remains authoritative.

## Current evidence

- RED: the first end-to-end soft-delete test received 405 because no DELETE route was mapped.
- GREEN: after adding the permission-protected endpoint and audit write, the focused API suite passed 17/17, including retention, list/detail hiding, repeat-delete 404, no-permission 403, missing-CSRF 400, stale-version 409, anonymous denial, and create/update regression coverage.
- Cleanup: inspected domain transition, endpoint transaction path, list-version contract, UI confirmation/error handling, and tests. No dead code or schema migration was needed; `IsDeleted` and `Version` were already persisted.
- Final `bun run check` passed: frontend build/lint, .NET build with 0 warnings/errors, and API tests 51 passed, 0 failed, 2 skipped. The skipped tests require dedicated PostgreSQL test variables; PostgreSQL-specific soft-delete atomicity/concurrency is not separately exercised by a provider test in this slice.
- A future restore workflow is explicitly out of scope; this is soft-delete, not permanent erasure.
