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

The API health endpoints are `GET /health/live` and `GET /health/ready`; readiness executes a small PostgreSQL query and returns only aggregate status. The frontend is at Vite's printed localhost URL. PostgreSQL is bound to `127.0.0.1` only. The initial catalog schema is applied with `bun run db:migrate`; product CRUD, user persistence/login, and permission enforcement are not implemented yet.

## Root commands

- `bun run dev:web` — Vite frontend development server.
- `bun run build:web` / `bun run lint:web` — frontend checks.
- `bun run db:up`, `bun run db:down`, `bun run db:logs`, `bun run db:migrate` — local PostgreSQL lifecycle and additive schema migration.
- `bun run api:build`, `bun run api:test` — .NET solution checks.
- `bun run check` — all current build/lint/test checks.

Stopping Compose does not delete the named database volume. To permanently delete local database data, use `docker compose down -v` only after making a backup and confirming deletion is intended.

## First administrator and production status

Authentication, account bootstrap, and CRUD APIs are not implemented. The initial migration creates only the catalog record table; it does not import workbook data or create a user. Do not expose this scaffold to a network or treat the placeholder application as production-ready. Setup and security behavior will be documented as those features are implemented.
