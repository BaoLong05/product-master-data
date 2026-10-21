# Architecture (proposed)

Status: initial target design; the first product-record schema and migration are implemented, while business APIs and identity/import schemas remain pending.

## Runtime components

```text
Browser (React + TypeScript + Vite)
          | HTTP JSON, same-origin/proxied in deployment
ASP.NET Core API (.NET 10)
          | application use cases
Domain <— Application —> Infrastructure (EF Core/Npgsql, Excel parser)
                                      |
                              PostgreSQL (Docker)
```

Keep the initial application a modular monolith. Do not introduce microservices or distributed infrastructure for one locally operated application.

## Project dependency direction

- `ProductMasterData.Domain`: business concepts and invariants; framework independent.
- `ProductMasterData.Application`: use cases, commands/queries, DTOs, ports and orchestration; depends on Domain.
- `ProductMasterData.Infrastructure`: EF Core, PostgreSQL, migrations, file/parser adapters; depends on Application and Domain.
- `ProductMasterData.Api`: HTTP contracts, authentication, authorization middleware, composition root; depends inward on Application and Infrastructure.
- `frontend/`: React/TypeScript client; communicates only through documented API DTOs.

No Domain-to-Infrastructure/API dependency. No controller binds EF entities or exposes domain entities. Create separate request, response, list/detail, and query DTOs and map deliberately. Avoid generic repositories/UoW/CQRS frameworks unless a concrete use case justifies them; EF Core DbContext transaction/change tracking is the default persistence mechanism.

## Initial domain modules

1. Catalog: product/sample records, search, detail, controlled update/delete.
2. Import: upload session, sheet/header mapping, validation preview, commit, history, row errors.
3. Identity and Access: local users, roles, granular permissions, role assignment.
4. Audit: append-only audit events for sensitive actions.

Boundaries are logical modules in one deployable API, not separate services.

## Persistence principles

- PostgreSQL is authoritative. Keep EF mappings and migrations in source; migration history and model snapshot must match changes.
- Use explicit constraints and indexes; choose identity/deduplication only after business confirmation.
- Preserve codes/identifiers as strings (including leading zeroes). Use decimal for money, DateTimeOffset UTC for system timestamps, and explicit date/time interpretation for imported spreadsheet values.
- Use optimistic concurrency for concurrent updates. Never reset or drop user data to resolve schema drift.
- Import batch metadata and commit outcome must be transactionally consistent. Large batch atomicity/resumption must be specified before implementation.

## HTTP and error conventions

- Versioned JSON API under `/api/v1`; camelCase JSON; explicit DTOs and bounded pagination.
- Stable error codes and RFC Problem Details; validation messages identify field and source row without echoing sensitive workbook contents.
- Keep controllers thin. Application use cases own orchestration and resource-scoped authorization; domain owns invariants.
- OpenAPI and integration tests are expected when the first endpoint is added.

## Async, cancellation and observability

All I/O is asynchronous and cancellation propagates from HTTP through use cases, storage and workbook reading. No `.Result`, `.Wait()`, unnecessary `Task.Run`, or untracked fire-and-forget work. Use structured logs and correlation/import IDs; never log credentials or raw spreadsheet rows. Treat `OperationCanceledException` as cancellation, not a generic application error.

## Deployment boundary

Developer setup runs frontend/API natively and PostgreSQL in Docker. Compose binds PostgreSQL to loopback. No internet-accessible deployment is in scope. LAN binding requires explicit configuration, authentication and firewall review before enabled.
