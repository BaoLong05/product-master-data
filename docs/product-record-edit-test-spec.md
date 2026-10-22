# Product record editing test specification

Status: in progress. This slice extends the existing list/create workflow so an authorized data manager can correct an active product record and see the change reflected in the catalog.

## API behavior

- `PUT /api/v1/records/{id}` requires `records.update` and a valid antiforgery token.
- The request supplies the current record `version` and all 27 source fields. It is a full replacement: omitted/null fields become null; this avoids ambiguous partial-update semantics.
- An active record is updated; unknown or soft-deleted IDs return 404.
- M.CODE remains optional and exact; a duplicate non-empty value returns safe 409 without altering the record.
- A stale version returns 409 and leaves both record and audit history unchanged. The version increments on each successful edit.
- A successful edit writes exactly one append-only `records.updated` audit event atomically with the update. Audit metadata contains only safe identifiers/version values, never source values.
- Missing permission, anonymous requests, and missing/invalid antiforgery token do not mutate either record or audit history.

## UI behavior

- A user can open an existing row, edit its fields, save changes, and see the refreshed catalog.
- The current client does not expose effective permissions for permission-aware button visibility, so the edit action may be visible to users who cannot use it; the server's `records.update` check is authoritative and rejects them.
- Save errors, including duplicate M.CODE or stale version, are shown without discarding the user's form values.

## Verification targets and current coverage

- API integration tests cover successful update/audit, denied permission, duplicate M.CODE, and stale version.
- Anonymous PUT is covered by `Anonymous_record_routes_return_unauthorized`; missing antiforgery token, unknown/deleted ID, and PostgreSQL-backed update concurrency/rollback remain additional coverage gaps.
- UI build/lint and focused API tests are run; `bun run check` is the final repository gate.

## Current evidence

- RED: `User_with_update_permission_can_replace_a_record_and_audit_the_change` initially received 405 because `PUT /api/v1/records/{id}` was not mapped. A test response DTO omitted `version` and first failed compilation; the fixture was corrected, then the same behavior test produced the expected 405.
- GREEN: after mapping the update route, the focused update/audit test passed 1/1. Follow-up endpoint tests for missing permission, stale version, and duplicate M.CODE passed in the focused record suite (13/13).
- Cleanup: inspected the update route, DTO mapping, audit metadata, frontend state transitions, and tests; removed no additional behavior. Frontend logout clears pending edit state so another signed-in session cannot inherit a stale edit form.
- Final check: `bun run check` passed; frontend build/lint passed, .NET build reported 0 warnings and 0 errors, and API tests reported 47 passed, 0 failed, 2 skipped. The skipped cases require dedicated PostgreSQL test variables, so this run does not prove real-provider update concurrency/rollback.
