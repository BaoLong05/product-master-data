# Delivery plan

This is an implementation sequence, not a claim that features exist. Deliver one focused vertical slice per feature/branch and verify each before proceeding.

## Phase 0 — documentation and bootstrap (complete)

Repository guidance, domain/data/import/permission docs, local Docker PostgreSQL, Bun root scripts, .NET layered solution, and React TypeScript scaffold are in place. The product-record schema is implemented; CRUD behavior is not.

## Phase 1 — API foundation (in progress)

The operational API foundation provides liveness/readiness health endpoints, a PostgreSQL readiness probe, consistent Problem Details for unmatched routes, a generated OpenAPI document, and API integration tests. The first PostgreSQL catalog schema and EF Core migration now store all 27 source values as nullable text, with partial unique M.CODE and active-list indexes. Remaining foundation work includes structured logging and database-backed integration-test setup. The first product-data API must follow authentication/authorization enforcement.

## Phase 2 — identity and permissions

Persisted local identity/role/permission schema and the permission catalog, safe first-admin bootstrap, cookie login, CSRF token validation, and per-IP login throttling are implemented. Remaining: logout, user and role management, checkbox UI, server-side permission enforcement, audit trail, and permission-matrix integration tests. Do not ship broad CRUD before authorization behavior is enforceable.

## Phase 3 — record management

Confirm field constraints and unique key; migrations, record list/detail/create/update/soft-delete, filtering/pagination, CRUD permission tests, audit, and UI.

## Phase 4 — safe Excel import

Parser and fixtures, upload limits, mapping, preview, row-level validation, invalid date/formula/link handling, duplicate policy, transactional/idempotent commit, error report, import history, authorization, and tests with the supplied workbook.

## Phase 5 — operations hardening

Backup/restore procedure, migration runbook, Docker health/readiness, local account recovery, accessibility, security review, larger import performance tests and documentation. Internet-facing deployment is out of scope unless separately requested.

## API and screen estimates

Initial planning estimate from the engineering standard: 32 HTTP endpoints and 9 primary workflow screens, plus a shared access-denied state. These counts are candidates, not implementation requirements; refine API/UI scope with confirmed use cases and acceptance rules before each phase.
