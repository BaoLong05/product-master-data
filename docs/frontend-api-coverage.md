# Frontend API coverage

This map records which currently implemented HTTP routes have a user-facing surface. The React client uses the existing contracts only; it does not imply that planned routes or workflows already exist.

| Route | UI surface | Behavior / boundary |
|---|---|---|
| `GET /api/v1/auth/csrf` | Sign-in, sign-out, record create/update/delete, import preview | Request-token bootstrap for state-changing requests. |
| `POST /api/v1/auth/login` | Sign-in form | Cookie login; generic failure message. |
| `POST /api/v1/auth/logout` | Header sign-out control | Cookie logout and server-side session-stamp revocation. |
| `GET /api/v1/auth/me` | Session restoration and signed-in header | Displays current identity; response does not contain effective permissions. |
| `GET /api/v1/companies` | Initial company library, company search, and pagination | Groups active records by exact non-blank company source name and supplies item counts; null/blank names share an unassigned group. Server enforces `records.read`; no year archive or company IDs are implied. |
| `GET /api/v1/records` | Company-scoped photo-first item gallery, global search, all-field filters, pagination | Active product records only; list items expose `id`, `companyName`, `itemName`, `mCode`, `itemCode`, `productType`, `productStatus`, `purchaseOrder`, `picImage`, and `picUrl`. `companyNameExact` scopes items to the selected source company; empty value selects unassigned records. Server remains authoritative for `records.read`. |
| `GET /api/v1/records/{id}` | Selected-record detail and edit form population | Detail view shows all 27 source fields; edit-save also requires read access to load details. |
| `POST /api/v1/records` | Create-record form | Sends the 27 optional source fields; server validates permission and CSRF. Repeated M.CODE values are allowed. |
| `PUT /api/v1/records/{id}` | Edit-record form | Includes observed version; server validates permission, CSRF, and concurrency. |
| `DELETE /api/v1/records/{id}` | Per-row confirmed soft-delete | Includes observed version and CSRF token; server retains the record and audits the action. |
| `GET /api/v1/records/{id}/audit` | Per-row “Lịch sử” control and inline history panel | Read-only; `audit.read` is independently checked by the server. A 403 is explained in the panel. Events remain in API order. |
| `POST /api/v1/imports/preview` | Excel structure/header, worksheet row preview | Read-only, bounded preview. Header diagnostics and explicit mapping are client-side only. |
| `POST /api/v1/imports/validate` | Import worksheet mapping: after explicitly mapping a source column to M.CODE and loading the sample rows, the user can see rows with repeated M.CODE values within that workbook | Informational in-workbook diagnostics only; requires `imports.preview`, antiforgery, and an explicit worksheet/column mapping. Stored records are not queried and repeated values do not block commit. |
| `POST /api/v1/imports/commit` | Explicit mapped-row import confirmation | Server validates request, worksheet, mapping, permissions and CSRF; existing records are not overwritten. |
| `GET /api/v1/imports/history` and `GET /api/v1/imports/history/{id}` | Import history and selected batch details | Read-only, paginated history/detail; `imports.read` is enforced by the API. |

`GET /health/live`, `GET /health/ready`, and `/openapi/v1.json` are operational/documentation surfaces and are intentionally not product workflow screens.

No UI is fabricated for user/role management, password changes, export, restore/permanent deletion, or audit of imports/exports/identity changes because those APIs or workflow contracts are not implemented. This includes checkbox role assignment: it remains pending with the user/role APIs. The frontend currently cannot hide controls based on effective permission because `/api/v1/auth/me` does not expose that information; all authorization decisions are enforced by the API and denied actions display an error. Local-only deployment remains in force.
