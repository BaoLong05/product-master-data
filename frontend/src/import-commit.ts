import type { ImportColumnMapping } from './import-column-mapping'

export type ImportRowIssue = { rowNumber: number; code: string }

export type ImportCommitResult = {
  batchId: string
  sourceFileName: string
  status: string
  scannedRows: number
  importedRows: number
  skippedRows: number
  replayed: boolean
  issues: ImportRowIssue[]
}

export type ImportHistoryItem = {
  batchId: string
  sourceFileName: string
  status: string
  startedAt: string
  scannedRows: number
  importedRows: number
  skippedRows: number
}

export type ImportBatchDetail = ImportHistoryItem & { completedAt: string; issues: ImportRowIssue[]; replayed: boolean }

export function createImportCommitRequest(
  file: File,
  csrfToken: string,
  worksheetName: string,
  mapping: ImportColumnMapping,
): RequestInit {
  const form = new FormData()
  form.set('file', file)
  form.set('worksheetName', worksheetName)
  form.set('columnMapping', JSON.stringify(mapping))

  return {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRF-TOKEN': csrfToken },
    body: form,
  }
}

export function createImportHistoryRequest(): RequestInit {
  return { method: 'GET', credentials: 'same-origin' }
}

export function importHistoryUrl(take = 20): string {
  if (!Number.isInteger(take) || take < 1 || take > 100) throw new RangeError('Import history take must be between 1 and 100.')
  return `/api/v1/imports/history?take=${take}`
}

export function importHistoryItemUrl(batchId: string): string {
  return `/api/v1/imports/history/${encodeURIComponent(batchId)}`
}
