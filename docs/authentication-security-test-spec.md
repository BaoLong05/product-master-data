# Authentication security test specification

Status: implemented acceptance criteria for CSRF defense and login throttling.

## CSRF contract

- `GET /api/v1/auth/csrf` issues/refreshes the antiforgery cookie and returns a request token as JSON.
- State-changing cookie-authenticated endpoints (`POST /api/v1/auth/login` and `/api/v1/auth/logout`) require that request token in `X-CSRF-TOKEN` and validate its cookie pair.
- A missing or invalid token is rejected before credentials are processed and never issues an auth cookie.
- Antiforgery tokens are not logged. The response token is intentionally available to same-origin browser code; the associated cookie remains HttpOnly, Secure, and SameSite=Strict.

## Login throttle contract

- Limit login attempts per client IP to five attempts per minute, with no queued requests.
- Excess attempts receive `429 Too Many Requests`; rejected attempts do not invoke credential authentication.
- Apply the policy only to login, not health or read-only endpoints.

## Acceptance tests

- Login without a valid antiforgery token is rejected; a token obtained from the CSRF endpoint permits a valid login.
- Malformed/expired tokens are rejected.
- Six login attempts from one client in one window produce five normal credential results then a 429; unrelated endpoints remain available.
- Login tests continue to assert active-user success and generic failures.

## Scope boundary

This specification defines the CSRF/login-throttle slice only; logout is separately covered by `local-logout-test-spec.md` and session revocation by `cookie-session-revocation-test-spec.md`. All state-changing cookie-authenticated routes must opt into the same antiforgery requirement. Deployment stays local-only; these controls do not by themselves make the app internet/LAN ready.
