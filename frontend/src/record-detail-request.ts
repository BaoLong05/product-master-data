export type RecordDetailRequestGuard = {
  begin: () => number
  isCurrent: (requestId: number) => boolean
  invalidate: () => void
}

export function createRecordDetailRequestGuard(): RecordDetailRequestGuard {
  let currentRequestId = 0
  return {
    begin: () => ++currentRequestId,
    isCurrent: (requestId) => requestId === currentRequestId,
    invalidate: () => { currentRequestId += 1 },
  }
}
