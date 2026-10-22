# Product record audit history UI test specification

Status: implemented as a per-record React panel using the existing API; no API or persistence changes were made. Seven frontend unit tests cover request routing/credentials, the separate `audit.read` error, loading/empty/error states, event rendering, and escaped metadata. Authenticated browser interaction has not yet been visually verified.

## User-visible behavior

- Each active record row exposes a “Lịch sử” control that opens that record’s history in an inline, accessible panel. A second click or the panel’s close button closes it.
- Opening history issues only `GET /api/v1/records/{id}/audit` with same-origin credentials. The frontend does not add an endpoint, mutate data, sort/rewrite server order, or infer permissions.
- Show a loading state, an empty state, the returned events in API order, and an error state. Event details include localized action/outcome labels where known, occurrence time, actor, correlation ID, target, and the API’s safe metadata.
- A 403 explains that `audit.read` is required. Other API errors remain visible without exposing implementation details. Since `/auth/me` does not return effective permissions, the control may be visible to users whose request the server rejects; the API remains authoritative.
- Changing the selected record or closing the panel must prevent a late response from replacing another record’s panel. Logout clears any open history.

## Acceptance tests

1. The audit loader calls the exact record-scoped GET route with `credentials: same-origin` and returns the API event array unchanged.
2. HTTP 403 becomes a clear `audit.read` permission message; other non-2xx responses become a safe status-based/API message.
3. The panel renders accessible heading/close control, loading, empty, and error states.
4. The panel renders each event’s action, outcome, timestamp, actor, correlation ID, target, and metadata; unknown action/outcome values remain readable.
5. Metadata is rendered as text (React escaping), not interpreted as markup.
6. The catalogue exposes the history control for each active record and associates it with that record’s panel; closing, logout, or selecting another record does not leave a stale request able to overwrite current UI state.

Acceptance cases 1–5 are automated in `frontend/tests/record-audit.test.ts` and `frontend/tests/record-audit-view.test.ts`. Case 6 is implemented in `frontend/src/App.tsx` with a request-generation guard and is compile/build checked; it remains pending authenticated browser-level interaction verification.

## Non-goals / unavailable APIs

- No import validation/commit, export, user/role management, password change, or audit for imports/exports/identity is added; those APIs are not implemented in the current backend.
- Liveness/readiness and OpenAPI routes are operational/documentation endpoints, not product workflow screens.
- No API, persistence, permission contract, or audit event format changes.
