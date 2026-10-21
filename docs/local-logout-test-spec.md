# Local logout security test specification

Status: implemented acceptance criteria for terminating the application cookie session.

## Contract: `POST /api/v1/auth/logout`

- Requires an authenticated application cookie and a valid antiforgery request token in `X-CSRF-TOKEN` paired with its antiforgery cookie.
- Anonymous requests are rejected; missing/invalid CSRF tokens do not clear an authenticated session.
- A valid request signs out the configured cookie scheme and returns `204 No Content` with an expired/cleared auth cookie.
- Before returning success, logout persists a new Identity security stamp; if stamp persistence fails, logout must not return success or imply that copied sessions were revoked.
- After logout, the same client can no longer access `GET /api/v1/auth/me`.
- Logout accepts no caller-supplied identity, roles, or other state. Do not log cookie/token values.

## Acceptance tests

- Authenticate, logout with a valid token, verify the auth cookie is cleared and `/auth/me` returns 401.
- Authenticated logout with a missing/invalid token is rejected, and `/auth/me` remains accessible.
- Anonymous logout is rejected and does not issue an auth cookie.

Logout updates the Identity security stamp before expiring the current browser cookie, so copied cookies for that user are rejected on their next request. It revokes all of that user's sessions rather than one device; per-device session management is not provided. Authenticated requests re-check the active account and security stamp against persistence, so deactivated accounts and stale cookies fail closed immediately.
