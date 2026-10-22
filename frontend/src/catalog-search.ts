export function buildCatalogQuery(
  page: number,
  pageSize: number,
  searchText: string,
  filters: Record<string, string>,
): string {
  const parameters = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  const search = searchText.trim()
  if (search) parameters.set('q', search)

  for (const [field, rawValue] of Object.entries(filters)) {
    const value = rawValue.trim()
    if (value) parameters.set(field, value)
  }

  return `?${parameters.toString()}`
}
