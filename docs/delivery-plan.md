# Delivery plan

This is an implementation sequence, not a claim that features exist. Deliver one focused vertical slice per feature/branch and verify each before proceeding.

## Phase 0 — documentation and bootstrap (current)

Repository guidance, domain/data/import/permission docs, local Docker PostgreSQL, Bun root scripts, .NET layered solution, React TypeScript scaffold. No feature API, schema, auth, or production-ready behavior.

## Phase 1 — API foundation

Agree the first endpoint/use case and auth bootstrap boundary; configure shared API conventions, Problem Details, OpenAPI, health checks, DI, structured logging, PostgreSQL/EF Core migrations, and integration-test infrastructure. First product API should be selected explicitly, expected likely read-only list/query only after schema and permission decisions.

## Phase 2 — identity and permissions

Local admin bootstrap, authentication, permission catalog, role and user management, checkbox UI, server-side authorization, audit trail, and permission matrix integration tests. Do not ship broad CRUD before authorization behavior is enforceable.

## Phase 3 — record management

Confirm field constraints and unique key; migrations, record list/detail/create/update/soft-delete, filtering/pagination, CRUD permission tests, audit, and UI.

## Phase 4 — safe Excel import

Parser and fixtures, upload limits, mapping, preview, row-level validation, invalid date/formula/link handling, duplicate policy, transactional/idempotent commit, error report, import history, authorization, and tests with the supplied workbook.

## Phase 5 — operations hardening

Backup/restore procedure, migration runbook, Docker health/readiness, local account recovery, accessibility, security review, larger import performance tests and documentation. Internet-facing deployment is out of scope unless separately requested.

## API and screen estimates

Initial planning estimate from the engineering standard: 32 HTTP endpoints and 9 primary workflow screens, plus a shared access-denied state. These counts are candidates, not implementation requirements; refine API/UI scope with confirmed use cases and acceptance rules before each phase.
