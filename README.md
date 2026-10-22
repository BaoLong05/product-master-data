# Product Master Data

Local-first web application for managing structured product records imported from Excel. See `docs/` for architecture, data/import rules, authorization, and the delivery plan. Engineering rules live in `.hermes/product-master-data-engineering-standard.md`.

## Stack

- ASP.NET Core / C# on .NET 10, layered Domain / Application / Infrastructure / API.
- React + TypeScript + Vite, with Bun as the frontend package manager and root task runner.
- PostgreSQL 17 in Docker Compose; persistent named volume.

## Prerequisites

Install .NET 10 SDK, Bun 1.3+, and Docker Desktop with its Linux container engine running. Copy `.env.example` to `.env` and replace the sample password with a private local value.

## Start local development

From repository root:

```sh
bun install
bun run db:up
dotnet tool restore
bun run dev:web
```

In another PowerShell terminal, set the API's database connection string to the same credentials in `.env`, apply the schema migration, then start the API:

```powershell
$env:ConnectionStrings__Postgres = "Host=127.0.0.1;Port=15432;Database=product_master_data;Username=product_master_data;Password=<same value as POSTGRES_PASSWORD in .env>"
bun run db:migrate
dotnet run --project src/ProductMasterData.Api
```

The API health endpoints are `GET /health/live` and `GET /health/ready`; readiness executes a small PostgreSQL query and returns only aggregate status. The frontend is at Vite's printed localhost URL. PostgreSQL is bound to `127.0.0.1` only. `bun run db:migrate` applies all checked-in additive migrations, including product catalog, identity/permissions, and append-only audit storage. First-admin bootstrap, local cookie login/logout, CSRF tokens, login throttling, server-side session revocation, and persisted permission checks for record and audit endpoints are implemented. See `docs/delivery-plan.md` for remaining workflow scope.

## Root commands

- `bun run dev:web` — Vite frontend development server.
- `bun run build:web` / `bun run lint:web` / `bun run test:web` — frontend build, lint, and tests.
- `bun run db:up`, `bun run db:down`, `bun run db:logs`, `bun run db:migrate` — local PostgreSQL lifecycle and additive schema migration.
- `bun run api:build`, `bun run api:test` — .NET solution checks.
- `bun run check` — all current build/lint/test checks.

Stopping Compose does not delete the named database volume. To permanently delete local database data, use `docker compose down -v` only after making a backup and confirming deletion is intended.

## First administrator and production status

The API supports explicit first-admin bootstrap, local login with CSRF validation and login throttling, and local cookie logout with server-side security-stamp revocation. Every authenticated request checks current account activity and stamp against persistence. Product record list/detail routes require the persisted `records.read` permission; create, update, and soft-delete require their respective permissions plus CSRF validation and write actor-attributed audit events atomically. Update and delete require an observed version to prevent stale overwrites. The list supports case-insensitive substring search across all 27 source fields and individual filters for each field; soft-deleted rows remain excluded. `GET /api/v1/records/{id}/audit` requires the separate `audit.read` permission. The React UI supports sign-in, browsing, global search, all-field filters, creation, editing, confirmed soft-delete, and read-only `.xlsx` worksheet/header inspection, exact source-header diagnostics, selected-sheet raw-row preview, and explicit temporary client-side column mapping with a mapped sample preview. Mapping is not auto-filled, persisted, or sent to the API; formula values remain hidden. Row validation, import batches/history, and commit remain open, as do restore, permanent erasure, audit-history UI, and account management. Audit coverage currently applies to record create/update/soft-delete only, so this scaffold is still local-only and not production-ready. Migrations create catalog, identity/permission, and audit tables, but no user, role, or product data is seeded. Logout revokes all sessions for that user; per-device session management is not provided.
