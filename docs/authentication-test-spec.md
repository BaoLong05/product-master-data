# Authentication pipeline test specification

Status: first identity vertical slice; authentication persistence, account management, and login are not implemented yet.

## Contract: `GET /api/v1/auth/me`

- Requests without an authenticated application session return `401 Unauthorized`.
- The endpoint must be protected by server-side authorization, not frontend-only route checks.
- The unauthenticated response contains no user, role, permission, or credential information.
- An authenticated session receives only the current principal's user ID and email; role/permission resolution is deferred until persistence and authorization are implemented.
- Authentication uses an application cookie; cookie issuance/login is a later slice after persisted users and password verification exist.

## Automated acceptance case

- `Current_identity_endpoint_rejects_anonymous_requests` calls the endpoint through `WebApplicationFactory`, asserts 401, and verifies the response does not disclose identity/grant fields.
- The generated OpenAPI document lists the protected current-identity route.

This slice does not add user storage, login/logout, roles, permissions, first-admin bootstrap, CSRF-protected state-changing requests, or any product-record API.
