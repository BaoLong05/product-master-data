# Server permission-enforcement test specification

## Contract

Authorization is deny-by-default and evaluated from current persisted grants. A cookie's claims or role names are not an authority source for application permissions. For a permission requirement such as `records.read`, the API authorizes only when the authenticated principal has a valid user ID and the database currently links that user to an Identity role with that permission key.

## Acceptance cases

- An authenticated user with a current role-to-permission grant is authorized.
- An authenticated user without the grant is denied.
- An anonymous principal is denied, even when a matching database grant exists for some user.
- A principal with a missing or malformed user ID is denied.
- A role-name/permission claim supplied only by the principal does not grant access.
- Removing the persisted grant takes effect on the next authorization evaluation; no stale permission claim may preserve access.
- Unknown/empty permission keys are not registered or accepted as permissions.
- The grant lookup and revocation behavior execute successfully through the real Npgsql/PostgreSQL provider, not only EF InMemory.

## Scope/non-goals

This slice provides the server-side authorization requirement/handler and policy registration for catalogued permission keys. It does not yet add user/role management endpoints or UI, audit permission changes, expose product CRUD, or claim every existing endpoint is protected by a business permission. Data endpoints must use the permission policy when added. PostgreSQL provider tests run only when `PRODUCTMASTERDATA_TEST_POSTGRES` is set to a dedicated disposable test database; never point it at the local development or production database.
