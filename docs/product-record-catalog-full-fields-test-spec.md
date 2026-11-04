# Company-card catalog and record-detail test specification

Status: implemented; automated verification complete with the full aggregate check blocked by the running API process holding build output files.

## User-visible goal

Reduce the default authenticated screen to a compact company-and-PIC-image catalog. Selecting a card opens a focused detail view containing all 27 source fields. Keep Excel import/history available on a separate workspace view so it no longer crowds the catalog.

## Scope and constraints

- Default to the catalog view; the import workflow and import history are reachable from a separate, localized workspace navigation control.
- A catalog card visibly contains only the company name and PIC image (no M.CODE, status, dates, actions, or other source values).
- Resolve an image from `picImage`, then `picUrl` only when it is a safe external HTTPS URL. Reject credentials in URLs, non-HTTPS schemes, localhost/local hostnames, and private/loopback IP literals. Use lazy loading and `referrerPolicy="no-referrer"`; never fetch imported URLs from the API/server.
- If neither field is a safe, loadable image URL, show a neutral localized no-image presentation; do not synthesize product/company data.
- Selecting a card requests the authorized detail endpoint and displays every source field with its localized label and unchanged stored text. Details remain read-only until the existing Edit action is selected.
- Keep all-field search/filter behavior, pagination, create/edit/delete/audit, localization (vi/en/ko), responsive layout, server authorization, and antiforgery behavior intact.
- Minimize the list DTO to `id`, `companyName`, `picImage`, and `picUrl`; the detail endpoint remains the complete 27-field contract.
- Clear selected detail data and invalidate in-flight detail requests after successful logout to prevent cross-session data disclosure.

## Acceptance tests

| ID | Given / when | Then | Layer |
|---|---|---|---|
| C1 | An authorized user lists a record with values in all source fields | List JSON contains only the card identity/image fields; no product detail fields leak into list items | API integration |
| C2 | The same user opens that record by ID | Detail JSON retains all 27 source fields and their exact stored strings | API integration |
| C3 | A card is rendered with company, valid image URL, and callback | Only company text and image are visible; activating the card invokes the selected-record callback | Frontend component |
| C4 | PIC image fields contain HTTPS, HTTP, `javascript:`, credential-bearing, localhost, private-IP, or malformed URLs | Only safe HTTPS external URLs resolve to an image; all unsafe values use the no-image presentation | Frontend unit/component |
| C5 | A detail record and localized field descriptors are rendered | All 27 labels and unchanged values appear in the focused detail view; null/empty values use the blank marker | Frontend component |
| C6 | Catalog is active, then user switches to import/history | Catalog is the uncluttered default; import workflow/history remain reachable and preserve their behavior | Frontend acceptance |
| C7 | A detail fetch is pending when logout succeeds | Late response cannot restore the prior user's record detail | Frontend regression |
| C8 | Catalog and detail are viewed at narrow and wide widths, in vi/en/ko | Layout remains readable, controls are keyboard-accessible, and every owned string is localized | Responsive/i18n tests |

## Canonical source fields

`dateValue`, `companyName`, `itemName`, `mCode`, `itemCode`, `productType`, `productStatus`, `approvalStatus`, `sampleOrProductionOrder`, `companyNameLetters`, `oldRegion`, `sampleSavedDate`, `picImage`, `purchaseOrder`, `productionOrderPdf`, `note`, `printedAt`, `discName`, `soi`, `maso`, `denier`, `price`, `region`, `quantity`, `picUrl`, `internalItem`, and `request`.

## Workbook limitation

The supplied workbook has 27 source columns, 11,816 data-row positions, 10 embedded images, and 9,315 formula cells with cached #NAME? results. Formula expressions and cached results must not be imported. Its rows fit the revised 20,000-position cap; embedded image extraction is not implemented. See docs/data-and-import.md for workbook observations.

## Verification evidence

- Focused API contract test: **1 passed** after building to an isolated output directory. It verifies the list DTO exposes only card fields and the detail endpoint retains every exact source string.
- Full API test project: **88 passed, 4 skipped, 0 failed**. Four PostgreSQL-provider tests were skipped because their dedicated provider configuration was not supplied.
- Frontend test suite: **58 passed, 0 failed**; frontend build and lint passed.
- `git diff --check`: passed.
- `bun run check` was attempted, but its default API build could not replace DLLs locked by the already-running `ProductMasterData.Api` process (PID 46824). The isolated API build/test succeeded without stopping that process.
- The original pre-implementation RED output was not captured, so no RED result is claimed. A `--no-build` run against stale binaries failed the new contract assertion; rebuilding from current source in an isolated output directory passed. This stale-binary failure is not treated as valid TDD RED evidence.
- No browser visual inspection was performed.
