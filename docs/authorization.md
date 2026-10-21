# Authentication and authorization design

Status: planned; no authentication or permission enforcement exists in the scaffold. All access must be deny-by-default once API endpoints are added.

## Permission model

Use explicit resource/action keys. Backend checks are authoritative; hiding a button or route is not access control. Separate `read`, `create`, `update`, `delete`, `export`, and import operations. Delete should be soft delete unless a confirmed retention policy requires otherwise. Check resource scope in the server when ownership/teams are introduced.

| Resource | Actions |
|---|---|
| Records | `records.read`, `records.create`, `records.update`, `records.delete`, `records.export` |
| Imports | `imports.create`, `imports.read`, `imports.preview`, `imports.commit`, `imports.cancel`, `imports.errors.download` |
| Users | `users.read`, `users.create`, `users.update`, `users.deactivate` |
| Roles | `roles.read`, `roles.create`, `roles.update`, `roles.delete`, `roles.assign` |
| Audit | `audit.read` |
| Local operations | `system.backup` (operator-only; never general filesystem access through API) |

Suggested role presets (editable only by an authorized administrator):

- Administrator: all application permissions.
- Data Manager: record CRUD, import operations and export; no user/role administration by default.
- Import Operator: record read and import operations; no record edit/delete or user/role administration.
- Viewer: record read only.
- Auditor: record read and audit read; export only if explicitly granted.

Presets are conveniences, not authorization bypasses. A custom role can have any explicitly selected permission set allowed by policy.

## CRUD permission matrix

| Actor | Read records | Create | Update | Delete | Export | Import commit | Manage users/roles | Read audit |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Administrator | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Data Manager | Yes | Yes | Yes | Yes | Yes | Yes | No | No (grant separately if required) |
| Import Operator | Yes | No | No | No | No | Yes | No | No |
| Viewer | Yes | No | No | No | No | No | No | No |
| Auditor | Yes | No | No | No | No by default | No | No | Yes |

Every cell maps to the corresponding permission, not a special hard-coded role check. `records.export` does not imply record edit/delete. Import preview and history viewing are separate from commit.

## Permission assignment UI and API

Provide role list/detail/editor with individual permission checkboxes. User create/edit includes explicit role-selection checkboxes and displays current grants. API accepts the selected full role set, validates each role and caller authority, prevents self-escalation/last-admin lockout, and audits changes. Replacing a role set requires explicit semantics; never silently append roles or trust a client-supplied permission list.

Authorization is verified on every API request, including direct object access, exports and downloads. Check current active account/grant state for sensitive operations; frontend visibility is UX only. Unauthorized access returns consistent 401/403 without leaking record existence where prohibited.

## Authentication and audit requirements

Use framework-supported adaptive password hashing; no default credentials. Accounts are local/internal: an administrator creates users and assigns roles; there is no public self-registration or external identity provider. Document first-admin bootstrap as an explicit one-time local operation. Select a browser auth/session mechanism with CSRF protection and secure cookie settings appropriate to deployment. Rate-limit login attempts and avoid account-enumeration messages.

Audit sensitive record changes/deletes, import commits, exports, user/role/permission changes with actor, UTC timestamp, action, target, outcome, correlation ID and safe metadata. Audit events are append-only to normal application users; avoid recording passwords, tokens, or full spreadsheet row values.

## Required tests

For each protected endpoint test permitted role succeeds, missing permission is denied, anonymous requests are denied where applicable, resource scope is enforced, and unauthorized responses do not leak protected data. Test permission changes and role revocation effect. Verify export cannot be used by a user with only `records.read`; test import preview does not write and commit is separately protected.
