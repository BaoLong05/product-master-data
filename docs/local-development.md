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
```

The Compose service binds PostgreSQL only to `127.0.0.1:15432` by default (override with `POSTGRES_PORT` if needed), uses health checks and a named volume. Database is not exposed to other computers by default.

## Start processes

Terminal 1 (frontend):

```sh
bun run dev:web
```

Terminal 2 (API host):

```sh
dotnet run --project src/ProductMasterData.Api
```

At this bootstrap stage the API host has no product endpoints, database connection, migrations or authentication; those are added with the first API feature. The frontend is the unmodified Vite starter pending product UI work.

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

`db:down` preserves the named volume. Never use `docker compose down -v` unless permanent data deletion is intended and a verified backup exists. Backup/restore commands and migration procedures will be added with the database implementation.

## Troubleshooting

- Docker daemon unavailable: start Docker Desktop and wait for its engine before `bun run db:up`.
- Port 5432 busy: set `POSTGRES_PORT` in private `.env` to another free local port.
- Frontend dependencies changed: run `bun install` from `frontend/` (the Vite application has its own `bun.lock`).
- Never store production credentials in `.env.example`, source control, logs, or sample Excel fixtures.
