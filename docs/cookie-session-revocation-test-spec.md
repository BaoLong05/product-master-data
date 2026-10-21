# Cookie session revocation test specification

Status: acceptance criteria for enforcing current account/session state on every authenticated request.

## Security contract

- The application cookie carries ASP.NET Core Identity's security-stamp claim, issued by the framework claims-principal factory; it must never be exposed by `/auth/me` or logged.
- On every authenticated request, validate that the user still exists, is active, and has the same current security stamp as the cookie. Missing/malformed user or stamp claims fail closed by rejecting the principal and clearing the presented cookie.
- Logout updates the user's security stamp in persistence before successfully signing out the current cookie. This invalidates copies of every previously issued application cookie for that user, not only the browser's cookie jar.
- If security-stamp persistence fails, logout must not return success or imply that copied sessions were revoked.
- Database availability is required to validate an authenticated session; authentication fails closed when the current account/stamp cannot be checked.

## Acceptance tests

- Copy an authenticated cookie into a separate client; after logout in the original client, the copied cookie receives 401 on `/auth/me`.
- Deactivating the account invalidates its already-issued cookie on the very next authenticated request.
- A missing or stale security-stamp claim is rejected rather than trusted.
- Existing login, CSRF, logout, and anonymous 401 behavior remain intact.

## Operational trade-off and limits

Validation reads current identity state for each authenticated request. This gives immediate deactivation/logout revocation at the cost of a database read and makes authenticated endpoints unavailable when that check cannot reach persistence. Logout revokes all sessions for the user, not just one device. Do not use client-only cookie deletion as evidence of server-side revocation.
