# API foundation test specification

Status: acceptance tests for the first API slice. These tests specify operational health endpoints only; product-record CRUD, database schema, authentication, and permissions remain out of scope for this slice.

## Endpoint contracts

### `GET /health/live`
- Returns HTTP `200 OK` with JSON `{"status":"Healthy"}` when the API process can serve requests.
- Does not depend on PostgreSQL being available.
- Response includes no connection strings, hostnames, exception details, or dependency metadata.

### `GET /health/ready`
- Returns HTTP `200 OK` with `{"status":"Healthy"}` when PostgreSQL readiness probe succeeds.
- Returns HTTP `503 Service Unavailable` with `{"status":"Unhealthy"}` when the database is unavailable or no usable database connection is configured.
- Does not expose connection strings, hostnames, exception details, or SQL/provider messages.
- Database I/O is asynchronous and receives cancellation.

### Other routes
- The template-only root `GET /` is removed; absent routes return `404 Not Found`.

## Automated acceptance cases

1. `Live_endpoint_is_healthy_even_when_database_is_unhealthy` — liveness returns exact 200/Healthy when the ready dependency is unhealthy.
2. `Ready_endpoint_is_healthy_when_database_is_healthy` — readiness returns exact 200/Healthy.
3. `Ready_endpoint_is_unavailable_without_exposing_database_details` — readiness returns exact 503/Unhealthy; connection secret and database host/name markers are not present in the response.
4. `Root_route_is_not_a_template_endpoint` — root route returns 404.

The first three are HTTP integration tests using `WebApplicationFactory` and a deterministic health-check substitution, so routing, HTTP status and serialization are tested without relying on host credentials. The real PostgreSQL adapter is tested by running the API against a local PostgreSQL connection separately.

## Commands and required evidence

- Run the focused API test project first. Verify the acceptance tests fail against the empty scaffold (RED), then pass after implementation (GREEN).
- Run `dotnet test ProductMasterData.slnx`, `dotnet build ProductMasterData.slnx`, `bun run check`, and a live readiness request against Docker PostgreSQL.
- Inspect test discovery and counts. A skipped or undiscovered test is not a pass.

## Explicit non-goals

No record DTOs, migrations, EF entities, authentication, authorization, import, CRUD, Swagger contract, or external-network exposure are added by this foundation slice. A record endpoint requires confirmed schema and authorization boundaries first.
