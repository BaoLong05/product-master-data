# Product record audit test specification

Status: implemented for successful product-record creation, with a permission-protected API read route and PostgreSQL append-only enforcement. Audit for updates, deletes, imports, exports, and identity/permission changes remains open; the React UI does not yet render the history.

## User and security behavior

When an authorized user creates a product record, the application persists one append-only audit event in the same database transaction as the record. The event records the authenticated actor ID, UTC occurrence time, action `records.created`, target record ID, outcome `succeeded`, and a server-generated request correlation ID. Metadata is limited to the record ID; source fields such as `M.CODE`, notes, URLs, credentials, and full request bodies are not copied into the audit log.

An authorized auditor can read the audit events for a record through `GET /api/v1/records/{id}/audit`, which requires `audit.read`. `records.read` alone does not grant audit access. Unknown records return 404. No API operation may update or delete audit events.

## Acceptance cases

- Create with `records.create`, then read the record audit with `audit.read`: return 201 for creation and exactly one event with the correct actor, record target, action, successful outcome, UTC timestamp, nonempty correlation ID, and safe metadata.
- `records.read` without `audit.read` cannot read audit events (403); anonymous access is denied (401).
- Rejected create requests (authorization, antiforgery, and duplicate non-empty `M.CODE`) leave both record and audit counts unchanged.
- An audit persistence failure must not leave a product record committed; a relational-provider test verifies the shared `SaveChanges` transaction rollback.
- The PostgreSQL schema has an additive `audit_events` table with nullable actor FK, UTC timestamp, action, target, outcome, correlation ID and JSONB metadata. Application/API callers have no update/delete path for events.

## Executable coverage and delivery evidence

- `Creating_a_record_writes_a_safe_audit_event_readable_by_an_auditor` verifies actor, UTC time, action, target, outcome, correlation ID, record-ID-only metadata, and that source values are not copied.
- `Record_read_permission_does_not_grant_audit_read_access` verifies `audit.read` is independent; `Auditor_gets_not_found_for_an_unknown_product_record` verifies unknown IDs return 404; `Anonymous_record_routes_return_unauthorized` includes the audit route.
- Create-denied, anonymous, missing-CSRF, and duplicate-code endpoint tests verify rejected requests do not append events; the duplicate test expects exactly the one event from the successful create.
- `PostgresAuditTests.Audit_events_are_append_only_and_failed_record_creation_rolls_back_its_audit_event` runs the additive migration and verifies `UPDATE`, `DELETE`, `TRUNCATE`, and deleting an actor referenced by an event are rejected; it also proves a uniqueness failure rolls back both a product record and its audit event.

## RED–GREEN–REFACTOR evidence

- Audit API RED: the new create/read test received 404 before the route existed. GREEN: the focused test passed 1/1 after implementation.
- Permission RED: with the audit permission requirement temporarily removed, an authenticated `records.read`-only user received 200 for an existing record's empty audit; restoring `audit.read` produced the expected 403 and the focused test passed 1/1.
- Anonymous RED: with the policy removed, the audit route returned 404 rather than 401; restoring the policy made the anonymous-route test pass 1/1.
- Unknown-record RED: with the existence check temporarily removed, an auditor received 200 with an empty list rather than 404; restoring the check made the focused test pass 1/1.
- PostgreSQL RED: before the append-only trigger, an `UPDATE` succeeded instead of throwing. A second RED showed actor deletion raised trigger error `P0001` rather than FK violation `23503` under `ON DELETE SET NULL`; changing the FK to `RESTRICT` and applying the migration to a fresh disposable database resolved it.
- PostgreSQL GREEN: the provider test passed 1/1 against PostgreSQL 17, including append-only triggers, actor retention, and transaction rollback. The actual migrated columns, JSONB type, FK action, indexes, and both triggers were inspected in PostgreSQL.
- Cleanup: disposed parsed JSON documents after cloning response metadata and simplified the test record-seeding helper. `dotnet ef migrations has-pending-model-changes` reported no model changes after the migration snapshot was reconciled.
- Final validation: `bun run check` passed with both PostgreSQL provider-test variables set to dedicated loopback databases. Frontend build/lint passed; .NET build had 0 warnings and 0 errors; the solution API test project discovered and passed 45/45 tests, with 0 failures and 0 skips. `dotnet ef migrations has-pending-model-changes` reported no pending changes. PostgreSQL 17 migration/schema verification is included above.
