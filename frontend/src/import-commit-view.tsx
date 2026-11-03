import type { ReactNode } from 'react'
import type { ImportBatchDetail, ImportCommitResult, ImportHistoryItem } from './import-commit'
import { formatLocaleDateTime, formatLocaleNumber, type Locale, type Translate } from './i18n'

function importSummary(scannedRows: number, importedRows: number, skippedRows: number, locale: Locale, t: Translate): string {
  return t('import.commitSummary', {
    scanned: formatLocaleNumber(locale, scannedRows),
    imported: formatLocaleNumber(locale, importedRows),
    skipped: formatLocaleNumber(locale, skippedRows),
  })
}

function issueLabel(rowNumber: number, code: string, locale: Locale, t: Translate): string {
  const row = formatLocaleNumber(locale, rowNumber)
  return code === 'duplicate_m_code'
    ? t('import.duplicateAtRow', { row })
    : t('import.unknownIssue', { row })
}

export function ImportCommitSummary({ result, locale, t }: {
  result: ImportCommitResult
  locale: Locale
  t: Translate
}): ReactNode {
  return (
    <section className="import-commit-result" aria-live="polite" aria-labelledby="import-commit-result-title">
      <h3 id="import-commit-result-title">{t('import.commitTitle')}</h3>
      <p className="import-commit-file">{t('import.commitFile', { file: result.sourceFileName })}</p>
      <p className="import-commit-counts">{importSummary(result.scannedRows, result.importedRows, result.skippedRows, locale, t)}</p>
      {result.replayed && <p className="import-replay-note" role="status">{t('import.commitReplay')}</p>}
      {result.issues.length > 0 && (
        <ul className="import-row-issues">
          {result.issues.map((issue) => <li key={`${issue.rowNumber}-${issue.code}`}>{issueLabel(issue.rowNumber, issue.code, locale, t)}</li>)}
        </ul>
      )}
    </section>
  )
}

export function ImportBatchDetailView({ detail, locale, t }: {
  detail: ImportBatchDetail
  locale: Locale
  t: Translate
}): ReactNode {
  return (
    <section className="import-batch-detail" aria-labelledby="import-batch-detail-title">
      <h4 id="import-batch-detail-title">{t('import.historyDetail', { file: detail.sourceFileName })}</h4>
      <time dateTime={detail.startedAt}>{formatLocaleDateTime(locale, detail.startedAt)}</time>
      <p>{importSummary(detail.scannedRows, detail.importedRows, detail.skippedRows, locale, t)}</p>
      {detail.issues.length > 0 && (
        <ul className="import-row-issues">
          {detail.issues.map((issue) => <li key={`${issue.rowNumber}-${issue.code}`}>{issueLabel(issue.rowNumber, issue.code, locale, t)}</li>)}
        </ul>
      )}
    </section>
  )
}

export function ImportHistoryView({
  items,
  selectedBatchId,
  selectedDetail,
  loading,
  detailLoading,
  error,
  locale,
  t,
  onRefresh,
  onSelect,
}: {
  items: readonly ImportHistoryItem[]
  selectedBatchId: string | null
  selectedDetail: ImportBatchDetail | null
  loading: boolean
  detailLoading: boolean
  error: string
  locale: Locale
  t: Translate
  onRefresh: () => void
  onSelect: (batchId: string) => void
}): ReactNode {
  return (
    <section className="import-history-panel" aria-labelledby="import-history-title">
      <div className="section-heading">
        <h3 id="import-history-title">{t('import.historyTitle')}</h3>
        <button className="button button-quiet" type="button" disabled={loading} onClick={onRefresh}>
          {loading ? t('import.historyRefreshing') : t('import.historyRefresh')}
        </button>
      </div>
      <p className="import-history-permission">{t('import.historyPermissionHint')}</p>
      {loading && <p role="status">{t('import.historyLoading')}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {!loading && !error && items.length === 0 && <p role="status">{t('import.historyEmpty')}</p>}
      {items.length > 0 && (
        <ul className="import-history-list">
          {items.map((item) => (
            <li key={item.batchId}>
              <button
                className="import-history-item"
                type="button"
                aria-current={selectedBatchId === item.batchId ? 'true' : undefined}
                aria-label={t('import.historySelect', { file: item.sourceFileName })}
                onClick={() => onSelect(item.batchId)}
              >
                <strong>{item.sourceFileName}</strong>
                <time dateTime={item.startedAt}>{formatLocaleDateTime(locale, item.startedAt)}</time>
                <span>{importSummary(item.scannedRows, item.importedRows, item.skippedRows, locale, t)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {detailLoading && <p role="status">{t('import.historyLoading')}</p>}
      {selectedDetail && selectedDetail.batchId === selectedBatchId && <ImportBatchDetailView detail={selectedDetail} locale={locale} t={t} />}
    </section>
  )
}
