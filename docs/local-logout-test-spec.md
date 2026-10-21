# Local logout security test specification

Status: implemented acceptance criteria for terminating the application cookie session.

## Contract: `POST /api/v1/auth/logout`

- Requires an authenticated application cookie and a valid antiforgery request token in `X-CSRF-TOKEN` paired with its antiforgery cookie.
- Anonymous requests are rejected; missing/invalid CSRF tokens do not clear an authenticated session.
- A valid request signs out the configured cookie scheme and returns `204 No Content` with an expired/cleared auth cookie.
- After logout, the same client can no longer access `GET /api/v1/auth/me`.
- Logout accepts no caller-supplied identity, roles, or other state. Do not log cookie/token values.

## Acceptance tests

- Authenticate, logout with a valid token, verify the auth cookie is cleared and `/auth/me` returns 401.
- Authenticated logout with a missing/invalid token is rejected, and `/auth/me` remains accessible.
- Anonymous logout is rejected and does not issue an auth cookie.

Logout is local cookie invalidation only. Server-side revocation of already copied cookies, account/session management, and logout-all-devices are not provided; do not claim those guarantees.
