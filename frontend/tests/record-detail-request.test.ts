import { expect, it } from 'bun:test'

it('invalidates an in-flight record detail request when a newer request or logout occurs', async () => {
  const module = await import('../src/' + 'record-detail-request').catch(() => null)
  expect(module).not.toBeNull()
  if (!module) return

  const guard = (module as unknown as { createRecordDetailRequestGuard: () => {
    begin: () => number
    isCurrent: (requestId: number) => boolean
    invalidate: () => void
  } }).createRecordDetailRequestGuard()

  const oldRequest = guard.begin()
  const currentRequest = guard.begin()
  expect(guard.isCurrent(oldRequest)).toBe(false)
  expect(guard.isCurrent(currentRequest)).toBe(true)

  guard.invalidate()
  expect(guard.isCurrent(currentRequest)).toBe(false)
  const afterLogout = guard.begin()
  expect(guard.isCurrent(afterLogout)).toBe(true)
})
