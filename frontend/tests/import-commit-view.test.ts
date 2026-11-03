import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'bun:test'
import { ImportBatchDetailView, ImportCommitSummary } from '../src/import-commit-view'
import type { ImportBatchDetail, ImportCommitResult } from '../src/import-commit'
import { translate } from '../src/i18n'

const result: ImportCommitResult = { batchId: 'batch-1', sourceFileName: 'catalog.xlsx', status: 'completed', scannedRows: 4, importedRows: 2, skippedRows: 2, replayed: false, issues: [{ rowNumber: 3, code: 'duplicate_m_code' }, { rowNumber: 4, code: 'duplicate_m_code' }] }
const detail: ImportBatchDetail = { batchId: 'batch-1', sourceFileName: 'catalog.xlsx', status: 'completed', startedAt: '2026-11-02T08:00:00Z', completedAt: '2026-11-02T08:00:01Z', scannedRows: 4, importedRows: 2, skippedRows: 2, replayed: false, issues: result.issues }
const t = (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate('vi', key, values)

describe('Excel import result views', () => {
  test('shows imported and skipped counts with safe row-only duplicate details', () => {
    const markup = renderToStaticMarkup(createElement(ImportCommitSummary, { result, locale: 'vi', t }))
    expect(markup).toContain('Đã nhập 2 / 4 dòng')
    expect(markup).toContain('Bỏ qua 2 dòng')
    expect(markup).toContain('dòng Excel 3')
    expect(markup).not.toContain('M.CODE:')
  })
  test('explains an idempotent replay without implying another write', () => {
    const markup = renderToStaticMarkup(createElement(ImportCommitSummary, { result: { ...result, replayed: true }, locale: 'vi', t }))
    expect(markup).toContain('Yêu cầu trùng lặp — đã trả lại kết quả của lần nhập trước')
  })
  test('renders a selected history batch with summary and row-only issues', () => {
    const markup = renderToStaticMarkup(createElement(ImportBatchDetailView, { detail, locale: 'vi', t }))
    expect(markup).toContain('catalog.xlsx')
    expect(markup).toContain('Đã nhập 2 / 4 dòng')
    expect(markup).toContain('dòng Excel 4')
    expect(markup).not.toContain('M.CODE:')
  })
})
