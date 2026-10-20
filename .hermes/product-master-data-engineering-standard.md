# Product Master Data — Engineering Standard

Status: proposed baseline for implementation. This repository currently has no substantive product/architecture specification beyond its README; this document records the initial proposal from the inspected `Sample Input Form.xlsx` and must be reconciled with confirmed business rules before schema or behavior is treated as final.

## 1. Product scope and source data

The sample workbook contains one `DATA` sheet, Excel table `Form_Responses`, 27 columns and about 9,986 rows. It combines Vietnamese/English/Korean labels, text identifiers, dates, checkbox values, notes, URLs, and `IMAGE(...)` formulas. Some cells in the date-formatted column L contain serial values outside Excel date bounds. Import must preserve original values where safe, flag invalid dates, and never silently coerce them. Treat image formulas as untrusted input: extract only supported URL references, never evaluate formulas. Initially retain image/file URLs as text; do not fetch remote content during import.

Business decisions still required: authoritative unique key / duplicate policy; which fields are required; whether to preserve the exact 27-column schema or normalize; import re-run behavior (skip/update/reject); account model and who administers accounts; backup/retention expectations. Until agreed, make behavior configurable/explicit and do not invent destructive defaults.

## 2. Proposed local-first stack

- Backend: ASP.NET Core Web API, C#; modular monolith with Domain, Application, Infrastructure, and API projects.
- Frontend: React + TypeScript, accessible responsive browser UI.
- Storage: PostgreSQL; EF Core/Npgsql migrations checked into source.
- Local operations: Docker Compose for web, API, PostgreSQL; persistent named database volume; health checks; environment-based secrets; documented backup/restore. Bind to localhost by default. LAN exposure is an explicit deployment setting; do not expose database publicly.
- Excel parsing: a maintained .NET Open XML reader (stream rows; enforce size/row/column limits). Avoid evaluating workbook formulas. Keep import processing bounded and cancellation-aware.

## 3. Architecture and DDD boundaries

Keep business modules cohesive; do not force every spreadsheet column into a separate aggregate. Suggested modules: Catalog (records and search), Import (upload/preview/validation/commit/history/errors), Identity & Access (users, roles, permissions), Audit, Operations (health/configuration only where needed).

- Domain: entities, value objects, aggregate invariants, domain policies/events. No ASP.NET, EF Core, database, filesystem, or vendor types.
- Application: commands/queries, use cases, application DTOs, ports, authorization/resource-scope checks, transaction orchestration. One use case per meaningful operation; avoid ceremonial generic service/repository layers.
- Infrastructure: EF Core mappings, migrations, persistence adapters, safe temporary-file handling, Excel parser adapters, password/token infrastructure.
- API: thin controllers/endpoints, HTTP request/response DTOs, authentication/authorization wiring, boundary validation, problem responses, composition root. Never return EF entities/domain aggregates directly.
- Frontend: typed API client, route/page components, permission-aware UX. Frontend checks improve UX only; server authorization is authoritative.

Use explicit DTOs per contract (e.g. `CreateRecordRequest`, `UpdateRecordRequest`, `RecordDetailResponse`, `RecordListItemResponse`, `PagedResponse<T>`). Do not use one DTO for create/update/list/detail; do not accept server-managed IDs, audit fields, or permissions from clients. Map deliberately and test mappings. Validate syntax/shape at API boundary and business invariants in domain/application.

## 4. C# and async rules

- Use async for I/O and propagate `CancellationToken` from HTTP through application and persistence/parser operations. Name asynchronous methods with `Async`.
- Await calls directly; no `.Result`, `.Wait()`, `async void` (except UI event handlers), fire-and-forget work, or `Task.Run` around I/O. Do not add `ConfigureAwait(false)` in ASP.NET Core application code without a specific library reason.
- Pass cancellation to EF Core, stream reads, and HTTP operations. Do not swallow `OperationCanceledException` as a generic failure.
- Prefer immutable inputs/results where practical; use nullable reference types, explicit types at public boundaries, and clear domain names. Avoid nullable ambiguity and magic strings; centralize permission identifiers.
- Keep controllers thin; use structured logs with correlation/import IDs. Never log passwords, tokens, uploaded workbook contents, or sensitive cell values.
- Use UTC timestamps (`DateTimeOffset`) for system events; define and document handling of Excel local dates separately. Use decimal for monetary values, never floating point. Preserve identifiers, leading zeroes, and codes as strings.
- Use database constraints and optimistic concurrency for integrity. Transactions cover each confirmed import commit and its audit/history outcome; design retry/idempotency explicitly. Do not use in-process locks for correctness.
- Errors use stable machine-readable codes and safe messages; validation errors identify row/column without dumping sensitive data. API uses consistent Problem Details.

## 5. Security, authentication, authorization, audit

Require authentication for application data and administrative functions. Bootstrap the first administrator through a documented one-time local setup process; do not ship default credentials. Hash passwords with a framework-supported adaptive password hasher. Use secure cookie/session or bearer-token design with CSRF protection appropriate to the selected browser auth model; protect secrets and configure restrictive CORS. Apply upload extension/content/size/row limits, safe temporary paths, cleanup, and no formula execution. Prevent stored/reflected XSS from spreadsheet text; render as text and validate/link-sanitize URLs. Avoid SSRF: never fetch arbitrary imported URLs on the server.

Authorization is deny-by-default and enforced server-side for every operation. Model permissions as resource + action, not broad UI roles alone. Proposed permission keys:

- `records.read`, `records.create`, `records.update`, `records.delete` (soft-delete preferred), `records.export`.
- `imports.create`, `imports.read`, `imports.preview`, `imports.commit`, `imports.cancel` (only if asynchronous), `imports.errors.download`.
- `users.read`, `users.create`, `users.update`, `users.deactivate`.
- `roles.read`, `roles.create`, `roles.update`, `roles.delete`, `roles.assign`.
- `audit.read`, `system.backup` (local operator-only; do not expose raw server filesystem through general API).

Role examples: Administrator (all permissions), Data Manager (record CRUD, import commit, export; no user/role admin), Import Operator (import create/read/preview/commit; record read), Viewer (record read), Auditor (audit read + record read). These are starting presets, not implicit grants. Provide a role/permission editor with explicit permission checkboxes; role assignment UI must show selected roles, and API must validate grant authority and prevent privilege escalation. Consider separate `read` and `export` because export can disclose much more data. Delete is separate from update; prefer soft delete with audit and restore policy. Always enforce object/resource scope when introduced. Log actor, action, target, timestamp, outcome, and correlation ID for sensitive CRUD, imports, permission changes, and exports; audit records are append-only to application users.

## 6. Import workflow and data integrity

1. Upload `.xlsx` only; validate size, structure, sheet selection, header row, duplicate headers, supported cell types, and limits.
2. Preview column mapping and a bounded sample. Allow mapping headers to known fields; unknown columns must be shown and either retained in an explicit extension/raw-data field or rejected by an agreed policy.
3. Validate rows without committing. Report counts and row/column-specific errors. Detect invalid/out-of-range dates, formula cells, malformed URLs, oversized strings, invalid boolean/number values, and duplicate candidates.
4. Require `imports.commit` and explicit confirmation. Commit transactionally with defined duplicate behavior and idempotency key/import batch identity. Large imports should use bounded batches with an explicit all-or-nothing or resumable contract; never claim atomicity if batching commits independently.
5. Persist import history, status, counts, source filename (sanitized), and error report metadata. Keep original workbook only if retention/security policy is agreed; default to deleting temporary upload after processing.
6. Support cancellation only if processing is asynchronous. Preserve audit trail and make retries safe.

## 7. API design and proposed endpoint inventory

REST under `/api/v1`; JSON camelCase; pagination/filter/sort allowlists; bounded page size; stable error codes; OpenAPI documented. The inventory below is a planning estimate, not implemented API. It counts 32 endpoints, excluding health/metrics, static assets, auth callbacks, and future restore/versioning endpoints.

| # | Method + route | Purpose | Permission |
|---|---|---|---|
| 1 | POST `/auth/login` | Sign in | Anonymous, rate-limited |
| 2 | POST `/auth/logout` | Sign out | Authenticated |
| 3 | GET `/auth/me` | Current identity and effective permissions | Authenticated |
| 4 | POST `/auth/change-password` | Change own password | Authenticated |
| 5 | GET `/records` | Search/filter/paginate | records.read |
| 6 | POST `/records` | Create record | records.create |
| 7 | GET `/records/{id}` | Read detail | records.read |
| 8 | PUT `/records/{id}` | Update record | records.update |
| 9 | DELETE `/records/{id}` | Soft-delete record | records.delete |
| 10 | GET `/records/{id}/audit` | Record change history | audit.read |
| 11 | GET `/records/export` | Export filtered result | records.export |
| 12 | POST `/imports` | Upload/create import batch | imports.create |
| 13 | GET `/imports` | List import batches | imports.read |
| 14 | GET `/imports/{id}` | Batch status/summary | imports.read |
| 15 | GET `/imports/{id}/mapping` | Get detected columns/mapping | imports.preview |
| 16 | PUT `/imports/{id}/mapping` | Save column mapping | imports.preview |
| 17 | POST `/imports/{id}/preview` | Validate and preview | imports.preview |
| 18 | GET `/imports/{id}/errors` | View row errors | imports.read |
| 19 | GET `/imports/{id}/errors/download` | Download error report | imports.errors.download |
| 20 | POST `/imports/{id}/commit` | Confirm and persist rows | imports.commit |
| 21 | DELETE `/imports/{id}` | Cancel/delete uncommitted batch | imports.cancel |
| 22 | GET `/users` | List users | users.read |
| 23 | POST `/users` | Create user | users.create |
| 24 | GET `/users/{id}` | User detail | users.read |
| 25 | PUT `/users/{id}` | Update user profile/status | users.update |
| 26 | DELETE `/users/{id}` | Deactivate user | users.deactivate |
| 27 | GET `/roles` | List roles and permissions | roles.read |
| 28 | POST `/roles` | Create role | roles.create |
| 29 | GET `/roles/{id}` | Role detail | roles.read |
| 30 | PUT `/roles/{id}` | Update role and full permission set | roles.update |
| 31 | DELETE `/roles/{id}` | Delete unused role | roles.delete |
| 32 | PUT `/users/{id}/roles` | Replace assigned role set | roles.assign |

Endpoint count can change after deciding whether authentication is local-only, whether imports are synchronous, whether audit endpoints are in scope, and whether role CRUD is fully configurable. No API should silently accept fields it does not implement. Do not add bulk delete or arbitrary SQL/search endpoints.

## 8. Proposed screen inventory

Estimate: 9 screens, with login and forbidden/access-denied pages counted separately. Modal/dialog states are not counted as separate screens.

1. Sign in.
2. Dashboard: total records, recent imports, import outcomes; only authorized aggregates.
3. Record list/search: paging, filters, sort, export gated separately.
4. Record detail/create/edit: create/edit controls shown by permission; delete confirmation and audit view are separate states.
5. Import upload + sheet/header mapping.
6. Import preview/validation results + explicit commit confirmation.
7. Import history/detail/error report.
8. User management: list/create/edit/deactivate and explicit role assignment checkboxes.
9. Role & permission management: role CRUD and granular permission checkboxes, including separate read/create/update/delete/export/import permissions.
10. Access denied (counted as a route/page, if implemented; if consolidating with login, screen total becomes 9). 

For planning and budgeting, use **9 primary workflow screens** (items 1–9) plus a reusable access-denied state; the list above labels access-denied separately only to make it visible. Responsive layouts may share these pages rather than multiply screen counts.

## 9. Testing and delivery standard

- Domain unit tests cover invariants; application tests cover use-case authorization, duplicate policy, transaction behavior, and cancellation; API integration tests exercise real PostgreSQL, auth, permission checks, validation, and error contracts; frontend tests cover page/permission behavior and key import flow.
- Import fixtures include this sample workbook, corrupt/oversized files, duplicate headers, formula cells, bad dates (including column L anomalies), multilingual text, blank rows, and leading-zero identifiers.
- Test CRUD authorization matrix: allowed action succeeds; missing permission is denied; unauthorized user cannot infer protected data; export permission does not imply update/delete. Test Admin/Data Manager/Import Operator/Viewer/Auditor presets and custom permission changes.
- Use test-first development for business behavior. Run focused tests, full relevant suites, build, lint/typecheck, migrations against PostgreSQL, and inspect test discovery/counts. A compile alone is not verification.
- Document setup, `.env.example`, Docker startup/shutdown, health checks, migration workflow, backup/restore, first-admin bootstrap, ports, and LAN binding safety. Never include secrets or real workbook data in committed fixtures without approval.

## 10. Definition of done

A feature is done only when its API/UI behavior, DTO validation, server permissions, audit requirements, database constraints/migration, tests, docs, and Docker/local operation are covered as applicable; the exact files and checks are reported; no unrelated worktree changes are overwritten. Build one vertical slice per feature/branch, preserve unrelated changes, and do not open a PR unless requested.
