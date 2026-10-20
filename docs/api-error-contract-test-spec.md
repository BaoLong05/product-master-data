# API error contracts and OpenAPI test specification

Status: proposed behavior for the API foundation slice. This specification does not define product endpoints, authentication, authorization, or persistence.

## Observable contracts

1. An unmatched route returns HTTP 404 with `application/problem+json` and a Problem Details body containing `status: 404` and a non-empty `traceId` extension. It must not expose exception or server configuration details.
2. The API publishes its generated OpenAPI document at `/openapi/v1.json`; the document is valid JSON and describes the existing `/health/live` and `/health/ready` operations.
3. Existing health endpoint behavior remains unchanged.

## Test cases

- Unknown route returns a safe 404 Problem Details document.
- OpenAPI document is available and includes both health routes.
- Existing API health integration tests remain green.

## Verification

Run the focused API test project, then `dotnet test ProductMasterData.slnx`, `dotnet build ProductMasterData.slnx`, `dotnet format ProductMasterData.slnx --verify-no-changes --no-restore`, and `bun run check`. Inspect discovered test totals.

## Out of scope

No product routes, custom business error codes, authentication/authorization, database schema, or record/import behavior.
