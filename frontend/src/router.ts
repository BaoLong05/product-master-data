export type AppRoute =
  | { kind: 'login' }
  | { kind: 'catalog' }
  | { kind: 'create' }
  | { kind: 'customer'; customerName: string }
  | { kind: 'record'; customerName: string; recordId: string }
  | { kind: 'import'; batchId?: string }

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

export function parseRoute(pathname = window.location.pathname): AppRoute {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0 || segments[0] === 'login') return { kind: 'login' }
  if (segments[0] === 'import') {
    if (segments[1] === 'history' && segments[2]) return { kind: 'import', batchId: segments[2] }
    return { kind: 'import' }
  }
  if (segments[0] !== 'catalog') return { kind: 'catalog' }
  if (segments[1] === 'new') return { kind: 'create' }
  if (segments[1] !== 'customer' || !segments[2]) return { kind: 'catalog' }

  const customerName = decodeSegment(segments[2])
  if (customerName === null) return { kind: 'catalog' }
  if (segments[3] === 'item' && segments[4]) return { kind: 'record', customerName, recordId: segments[4] }
  return { kind: 'customer', customerName }
}

export const appPaths = {
  login: () => '/login',
  catalog: () => '/catalog',
  create: () => '/catalog/new',
  customer: (customerName: string) => `/catalog/customer/${encodeURIComponent(customerName)}`,
  record: (customerName: string, recordId: string) => `/catalog/customer/${encodeURIComponent(customerName)}/item/${encodeURIComponent(recordId)}`,
  import: () => '/import',
  importHistory: (batchId: string) => `/import/history/${encodeURIComponent(batchId)}`,
}

export function navigate(path: string, replace = false): void {
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
