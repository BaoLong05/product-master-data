# Delivery plan

This is an implementation sequence, not a claim that features exist. Deliver one focused vertical slice per feature/branch and verify each before proceeding.

## Phase 0 — documentation and bootstrap (complete)

Repository guidance, domain/data/import/permission docs, local Docker PostgreSQL, Bun root scripts, .NET layered solution, and React TypeScript client are in place. The product-record schema and first list/detail/create workflow are implemented; update/delete, search/filter, import, and audit remain open.

## Phase 1 — API foundation (in progress)

The operational API foundation provides liveness/readiness health endpoints, a PostgreSQL readiness probe, consistent Problem Details for unmatched routes, a generated OpenAPI document, and API integration tests. The first PostgreSQL catalog schema and EF Core migration now store all 27 source values as nullable text, with partial unique M.CODE and active-list indexes. The first product-data APIs apply authentication and persisted-permission enforcement. Remaining foundation work includes structured logging and database-backed integration-test setup.

## Phase 2 — identity and permissions

Persisted local identity/role/permission schema and the permission catalog, safe first-admin bootstrap, cookie login/logout, CSRF token validation, per-IP login throttling, and per-request active-user/security-stamp validation are implemented. Product record list/detail routes require `records.read`; create requires `records.create` and antiforgery validation. Logout rotates the user's stamp to revoke copied cookies for all sessions; per-device session management remains unsupported. Remaining: user and role management, checkbox UI, update/delete authorization, audit trail, PostgreSQL-backed permission integration tests, and permission-matrix tests. Do not expose the create workflow beyond local development before audit coverage is added.

## Phase 3 — record management

First slice delivered: paged active-record list, detail, create with optional text fields and exact non-empty `M.CODE` uniqueness, and signed-in React list/create UI. Remaining: update/soft-delete, search/filter, PostgreSQL-backed record API/concurrency tests, append-only audit events, and broader UI permission affordances. The current create workflow is not production-ready until audit coverage is added.

## Phase 4 — safe Excel import

Parser and fixtures, upload limits, mapping, preview, row-level validation, invalid date/formula/link handling, duplicate policy, transactional/idempotent commit, error report, import history, authorization, and tests with the supplied workbook.

## Phase 5 — operations hardening

Backup/restore procedure, migration runbook, Docker health/readiness, local account recovery, accessibility, security review, larger import performance tests and documentation. Internet-facing deployment is out of scope unless separately requested.

## API and screen estimates

Initial planning estimate from the engineering standard: 32 HTTP endpoints and 9 primary workflow screens, plus a shared access-denied state. These counts are candidates, not implementation requirements; refine API/UI scope with confirmed use cases and acceptance rules before each phase.
