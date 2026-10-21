# Local username/password login test specification

Status: implemented login contract. CSRF defense and login throttling are covered by `authentication-security-test-spec.md`.

## Contract: `POST /api/v1/auth/login`

- Accept a username and password as JSON; never accept identity, role, or permission claims from the request.
- Validate credentials through ASP.NET Core Identity's configured adaptive password hasher.
- Successful login for an active account returns `204 No Content` and issues the configured HttpOnly, SameSite=Strict, Secure application cookie.
- Unknown username, incorrect password, and inactive account all return the same generic `401 Unauthorized` response shape without account-specific details.
- Invalid/missing request fields return `400 Bad Request` without echoing the supplied password.
- Passwords and cookie contents must not be logged or returned in response bodies.
- Existing `GET /api/v1/auth/me` recognizes the issued cookie and remains unauthorized without it.

## Acceptance tests

- Valid active account credentials authenticate, issue an application cookie, and allow `/auth/me` to return the authenticated identity.
- Invalid credentials and inactive account credentials yield indistinguishable unauthorized responses and no authenticated session.
- Malformed or missing credentials are rejected without credential disclosure.
- The OpenAPI document lists the login route.

## Out of scope

Logout, account-management endpoints, password reset/change, role/permission resolution, and frontend login UI remain out of scope. Deployment remains local-only.
