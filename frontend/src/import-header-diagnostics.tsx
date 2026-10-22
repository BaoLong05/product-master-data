import type { ReactNode } from 'react'
import { analyzeImportHeaders, importSourceHeaderCount } from './import-headers'
import { formatLocaleNumber } from './i18n'
import { useAppPreferences } from './use-app-preferences'

export function ImportHeaderDiagnostics({ headers }: { headers: readonly (string | null)[] }): ReactNode {
  const { locale, t } = useAppPreferences()
  const analysis = analyzeImportHeaders(headers)
  const recognizedCount = importSourceHeaderCount - analysis.missingHeaders.length

  return (
    <section className="import-header-diagnostics" aria-live="polite" aria-labelledby="import-header-diagnostics-title">
      <h3 id="import-header-diagnostics-title">{t('import.headersTitle')}</h3>
      <p>{t('import.headersRecognized', { recognized: formatLocaleNumber(locale, recognizedCount), total: formatLocaleNumber(locale, importSourceHeaderCount) })}</p>
      <ol className="import-header-list">
        {analysis.columns.map(({ columnNumber, header, recognized, duplicate, blank }) => (
          <li key={columnNumber}>
            <span className="import-header-name">{t('import.column', { number: formatLocaleNumber(locale, columnNumber), header: header || t('import.blank') })}</span>
            <span className="import-header-statuses">
              {recognized && <span>{t('import.recognized')}</span>}
              {duplicate && <span>{t('import.duplicate')}</span>}
              {blank && <span>{t('import.blankHeader')}</span>}
              {!recognized && !blank && <span>{t('import.unrecognized')}</span>}
            </span>
          </li>
        ))}
      </ol>
      {analysis.missingHeaders.length > 0 && (
        <details className="import-missing-headers">
          <summary>{t('import.missingHeaders', { count: formatLocaleNumber(locale, analysis.missingHeaders.length) })}</summary>
          <ul>{analysis.missingHeaders.map((header) => <li key={header}>{header}</li>)}</ul>
        </details>
      )}
      <p className="import-preview-note">{t('import.headersNote')}</p>
    </section>
  )
}
