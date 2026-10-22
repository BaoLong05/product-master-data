# Product record search and filter test specification

Status: implemented as a local-only catalog workflow; no record schema changes were needed.

## Query contract

- `GET /api/v1/records` remains protected by `records.read`; active records remain the only searchable/filterable population.
- Optional `q` performs case-insensitive substring search across all 27 source fields (including notes and request text); null values do not match.
- Each source field's camelCase API name is also an optional filter key. A non-empty filter is a case-insensitive substring match limited to that field. Empty filter values mean “not applied”; null/blank-field filtering is not included.
- Search and any number of field filters combine with AND (the q condition is an OR across fields). Pagination/order and totalCount are computed after filters.
- Unknown query keys and repeated values for a key return 400 instead of being silently ignored. `page`, `pageSize`, and `q` are reserved query keys.
- Filtering and search never include soft-deleted records, and no source value is evaluated as a formula or URL.

## UI behavior

- The catalog includes global search and an expandable filter section with one substring-search input per source field.
- Search/filter apply together; applying or clearing criteria resets to page 1. Clearing criteria restores the unfiltered active-record page.
- Existing pagination, edit, and soft-delete actions continue to operate on the filtered result set. An empty result has a distinct message and reset action.
- The filter grid reflows to two columns on tablet widths and one column on narrow phones; visual browser verification was not performed in this delivery.

## Verification evidence

- RED: the first global-search test returned both records because `q` was ignored; the field-filter test returned 400 because `note` was unsupported.
- GREEN: focused API tests passed; an in-memory test iterates all 27 string fields and verifies both global search and per-field filtering, while a combined query test verifies q + filters and filtered pagination.
- PostgreSQL provider: the endpoint search + combined field-filter test passed 1/1 against a disposable, volume-free PostgreSQL 17 container on a random loopback port. The pre-existing repository PostgreSQL container remained running and unchanged; the temporary container was removed.
- Frontend: `bun run check` includes 2 Bun tests (34 assertions) confirming pagination, trimming/blank omission, and serialization of all 27 field-filter keys. A test initially placed under `src` caused the production TypeScript build to reject `bun:test`; it was moved to `frontend/tests` and the build then passed.
- Cleanup: consolidated matching-expression construction, removed an unused local, reviewed the changed API/UI/test/docs files, and kept test-only Bun imports outside the production TypeScript build.
- Final full verification: `bun run check` passed; frontend build and lint passed, 2 frontend tests passed, .NET build had 0 warnings/0 errors, and API tests reported 54 passed, 3 skipped, 0 failed (57 total). The skipped tests are the optional PostgreSQL audit, permission, and search tests; the search provider test separately passed as noted above.
- No database schema/index changes were introduced; large-catalog performance has not been benchmarked.
