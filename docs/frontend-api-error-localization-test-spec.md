# Frontend API error localization test specification

## Contract

The API currently returns `ApiErrorResponse` objects shaped as `{ code, message }`. The client must select user-facing text by the stable backend `code`, and translate that text using the active locale (`vi`, `en`, or `ko`). It must not display the backend's English `message` as the localized UI message. Unknown codes and status-only responses use safe localized status fallbacks; 401, 403, 404, 409, and 429 have specific fallbacks. Audit 403 responses retain the audit-specific permission message.

## Backend codes verified in source

- `invalid_antiforgery_token`
- `missing_workbook`
- `workbook_too_large`
- `unsupported_workbook_type`
- `invalid_workbook`
- `invalid_pagination`
- `invalid_query_parameter`
- `invalid_query_value`
- `record_version_conflict`
- `duplicate_m_code`

A code not included above must never cause the client to render arbitrary server-provided `message` text. Do not alter API contracts or invent server codes.

## Acceptance cases

1. Every source-verified code maps to a dedicated message key with non-empty Vietnamese, English, and Korean text.
2. For a response containing a known code plus an English backend message, the selected UI message is the active-locale translation, not the backend message.
3. Unknown code, malformed JSON, empty body, or a status-only error returns a safe localized fallback.
4. Known HTTP status fallbacks are localized; audit `403` remains audit-specific.
5. Network exceptions continue through existing frontend-owned localized connection/error states.

# Responsive UI acceptance specification

## Viewport matrix

Test the public login and authenticated catalog/layouts at CSS viewport widths 320, 360, 390, 430, 768, 1024, 1280, 1440, and 1600 px. Heights include short landscape 568/640 px and typical 800/900/1024 px where available.

## Acceptance

1. At narrow phone widths (320–430px), the global header, locale/theme controls, primary actions, and pagination wrap/reflow without horizontal document overflow or clipped controls.
2. At tablet widths (768–1024px), page headings, filter grids, forms, login composition, and header remain within the viewport; dense tables scroll only inside their bounded table wrappers.
3. At laptop/wide desktop widths (1280–1600px), content remains centered with a readable maximum width and forms do not stretch without limit.
4. Page shell and grid/flex children can shrink (`min-width: 0` where required); vertical content remains scrollable on short screens.
5. Existing semantics, keyboard access, touch targets, reduced-motion support, and API behavior are preserved.
6. Record which viewport widths/routes were actually inspected in a browser. Static CSS tests/build are not visual responsive verification.
