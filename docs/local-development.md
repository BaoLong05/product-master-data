# Local development and operations

## Prerequisites

- Windows 11 with Docker Desktop running Linux containers.
- .NET 10 SDK.
- Bun 1.3 or newer.

Check tools with `dotnet --version`, `bun --version`, and `docker --version`.

## First-time setup

From repository root, create a private local environment file and install JS dependencies:

```sh
cp .env.example .env
```

Edit `.env` and replace `POSTGRES_PASSWORD`; do not commit `.env`. Then run:

```sh
bun install
bun run db:up
dotnet tool restore
```

The Compose service binds PostgreSQL only to `127.0.0.1:15432` by default (override with `POSTGRES_PORT` if needed), uses health checks and a named volume. Database is not exposed to other computers by default.

## Start processes

Before the first migration, configure the API connection string with the same local database credentials. In PowerShell, in the terminal that will run the API:

```powershell
$env:ConnectionStrings__Postgres = "Host=127.0.0.1;Port=15432;Database=product_master_data;Username=product_master_data;Password=<same value as POSTGRES_PASSWORD in .env>"
bun run db:migrate
```

Use the same PowerShell terminal for `bun run db:migrate` and `dotnet run`; replace the placeholder locally and never paste the password into chat or commit it.

Terminal 1 (frontend):

```sh
bun run dev:web
```

Terminal 2 (API host):

Set `ConnectionStrings__Postgres` to a connection string using the same local credentials as `.env`, then run the API. Example for PowerShell:

```powershell
$env:ConnectionStrings__Postgres = "Host=127.0.0.1;Port=15432;Database=product_master_data;Username=product_master_data;Password=<same value as POSTGRES_PASSWORD in .env>"
dotnet run --project src/ProductMasterData.Api
```

`GET /health/live` reports process liveness without checking PostgreSQL. `GET /health/ready` returns 200 only when PostgreSQL accepts a query; otherwise it returns 503 with a generic status and no connection details. Unmatched routes return Problem Details with a trace ID and no internal exception details. The generated OpenAPI document is available at `/openapi/v1.json`. Vite proxies `/api` to `http://localhost:5290`; run the API on its configured HTTP development profile so the browser can use login, catalog, and record-create routes through one origin. For browser login, get a request token from `GET /api/v1/auth/csrf`, then include it as `X-CSRF-TOKEN` when posting credentials to `/api/v1/auth/login`; login is limited to five attempts per client IP per minute. `GET /api/v1/auth/me` is protected by the application cookie-authentication pipeline and returns 401 to anonymous requests. Each authenticated request checks that the user is active and the cookie's security stamp matches the current database value. `POST /api/v1/auth/logout` requires an authenticated cookie and a valid CSRF token; it rotates the user's stamp and expires the current browser cookie, invalidating copied cookies on their next request. This requires a database identity check for each authenticated request and fails closed if persistence is unavailable. Product, local identity/permission, and audit schemas are migrated. Product record list/detail routes require the current persisted `records.read` grant; create requires `records.create` and a valid CSRF token, and persists a safe actor-attributed audit event atomically with the record. `GET /api/v1/records/{id}/audit` requires `audit.read`; PostgreSQL blocks audit update/delete/truncate. The React UI supports sign-in, list, and manual create but does not yet show audit history. User/role management, update/delete, search/filter, and Excel import remain incomplete; audit currently covers record creation only.

## Checks

Run independently while developing:

```sh
bun run build:web
bun run lint:web
bun run api:build
bun run api:test
bun run check
```

`bun run check` is a convenience aggregate; still inspect test discovery and individual project results.

## Database lifecycle and backups

```sh
bun run db:logs
bun run db:down
```

`bun run db:migrate` applies checked-in EF Core migrations additively; it does not reset or drop the PostgreSQL volume. `db:down` preserves the named volume. Never use `docker compose down -v` unless permanent data deletion is intended and a verified backup exists. Backup/restore commands will be added with the operations-hardening phase.

## Troubleshooting

- Docker daemon unavailable: start Docker Desktop and wait for its engine before `bun run db:up`.
- Port 5432 busy: set `POSTGRES_PORT` in private `.env` to another free local port.
- Frontend dependencies changed: run `bun install` from `frontend/` (the Vite application has its own `bun.lock`).
- Never store production credentials in `.env.example`, source control, logs, or sample Excel fixtures.
