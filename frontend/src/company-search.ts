export function buildCompanyQuery(page: number, pageSize: number, search: string): string {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  const term = search.trim()
  if (term) query.set('q', term)
  return query.toString()
}
