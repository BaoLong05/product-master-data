# Frontend API coverage

This map records which currently implemented HTTP routes have a user-facing surface. The React client uses the existing contracts only; it does not imply that planned routes or workflows already exist.

| Route | UI surface | Behavior / boundary |
|---|---|---|
| `GET /api/v1/auth/csrf` | Sign-in, sign-out, record create/update/delete, import preview | Request-token bootstrap for state-changing requests. |
| `POST /api/v1/auth/login` | Sign-in form | Cookie login; generic failure message. |
| `POST /api/v1/auth/logout` | Header sign-out control | Cookie logout and server-side session-stamp revocation. |
| `GET /api/v1/auth/me` | Session restoration and signed-in header | Displays current identity; response does not contain effective permissions. |
| `GET /api/v1/records` | Catalog table, global search, all-field filters, pagination | Active records only; server remains authoritative for `records.read`. |
| `GET /api/v1/records/{id}` | Edit form population | Existing detail route; edit-save also requires read access to load details. |
| `POST /api/v1/records` | Create-record form | Sends the 27 optional source fields; server validates permission, CSRF, and non-empty M.CODE uniqueness. |
| `PUT /api/v1/records/{id}` | Edit-record form | Includes observed version; server validates permission, CSRF, and concurrency. |
| `DELETE /api/v1/records/{id}` | Per-row confirmed soft-delete | Includes observed version and CSRF token; server retains the record and audits the action. |
| `GET /api/v1/records/{id}/audit` | Per-row “Lịch sử” control and inline history panel | Read-only; `audit.read` is independently checked by the server. A 403 is explained in the panel. Events remain in API order. |
| `POST /api/v1/imports/preview` | Excel structure/header, worksheet row preview | Read-only, bounded preview. Header diagnostics and explicit mapping are client-side only; no validation or import commit occurs. |

`GET /health/live`, `GET /health/ready`, and `/openapi/v1.json` are operational/documentation surfaces and are intentionally not product workflow screens.

No UI is fabricated for user/role management, password changes, export, restore/permanent deletion, import validation/commit/history, or audit of imports/exports/identity changes because those APIs or workflow contracts are not implemented. This includes checkbox role assignment: it remains pending with the user/role APIs. The frontend currently cannot hide controls based on effective permission because `/api/v1/auth/me` does not expose that information; all authorization decisions are enforced by the API and denied actions display an error. Local-only deployment remains in force.
