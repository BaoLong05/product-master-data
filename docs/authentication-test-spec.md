# Authentication pipeline test specification

Status: the anonymous current-identity contract is implemented. Local login is specified in `local-login-test-spec.md`.

## Contract: `GET /api/v1/auth/me`

- Requests without an authenticated application session return `401 Unauthorized`.
- The endpoint must be protected by server-side authorization, not frontend-only route checks.
- The unauthenticated response contains no user, role, permission, or credential information.
- An authenticated session receives only the current principal's user ID and email; role/permission resolution is deferred until persistence and authorization are implemented.
- Authentication uses the configured secure application cookie. Login issuance and credential validation are specified separately.

## Automated acceptance case

- `Current_identity_endpoint_rejects_anonymous_requests` calls the endpoint through `WebApplicationFactory`, asserts 401, and verifies the response does not disclose identity/grant fields.
- The generated OpenAPI document lists the protected current-identity route.

This current-identity slice does not add logout, roles/permissions resolution, or any product-record API.
