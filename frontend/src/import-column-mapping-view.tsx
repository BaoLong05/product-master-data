import type { ReactNode } from 'react'
import { useAppPreferences } from './use-app-preferences'
import { formatLocaleNumber } from './i18n'
import {
  availableImportTargetFields,
  buildMappedImportPreview,
  type ImportColumnMapping as ImportColumnMappingState,
  type ImportPreviewRow,
  type ImportTargetField,
} from './import-column-mapping'

export function ImportColumnMapping({ headers, fields, mapping, rows, onChange }: {
  headers: readonly (string | null)[]
  fields: readonly ImportTargetField[]
  mapping: ImportColumnMappingState
  rows?: readonly ImportPreviewRow[]
  onChange: (columnNumber: number, targetKey: string) => void
}): ReactNode {
  const { locale, t } = useAppPreferences()
  const mappedPreview = buildMappedImportPreview(headers, rows ?? [], mapping, fields)

  return (
    <section className="import-column-mapping" aria-labelledby="import-column-mapping-title">
      <h3 id="import-column-mapping-title">{t('import.mappingTitle')}</h3>
      <p>{t('import.mappingHint')}</p>
      <p className="import-mapping-status" role="status" aria-live="polite">
        {mappedPreview.columns.length === 0 ? t('import.mappingNone') : t('import.mappingCount', { count: formatLocaleNumber(locale, mappedPreview.columns.length) })}
      </p>
      <div className="import-mapping-grid">
        {headers.map((header, index) => {
          const columnNumber = index + 1
          const selectableKeys = new Set(availableImportTargetFields(fields, mapping, columnNumber).map(({ key }) => key))
          return (
            <div className="import-mapping-field" key={columnNumber}>
              <label htmlFor={`import-map-column-${columnNumber}`}>{t('import.mappingFieldLabel', { number: formatLocaleNumber(locale, columnNumber), header: header || t('import.blank') })}</label>
              <select
                id={`import-map-column-${columnNumber}`}
                value={mapping[columnNumber] ?? ''}
                onChange={(event) => onChange(columnNumber, event.currentTarget.value)}
              >
                <option value="">{t('import.noMapping')}</option>
                {fields.map(({ key, label }) => (
                  <option key={key} value={key} disabled={!selectableKeys.has(key)}>{label}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
      {mappedPreview.columns.length > 0 && (!rows ? (
        <p className="import-mapping-message">{t('import.mappingSampleHint')}</p>
      ) : rows.length === 0 ? (
        <p className="import-mapping-message">{t('import.noRowsForMapping')}</p>
      ) : (
        <div className="import-mapped-preview">
          <h4>{t('import.mappedPreviewTitle')}</h4>
          <div className="import-mapped-preview-scroll">
            <table className="import-mapped-table">
              <caption className="sr-only">{t('import.mappedPreviewCaption')}</caption>
              <thead><tr><th scope="col">{t('import.excelRow')}</th>{mappedPreview.columns.map((column) => <th scope="col" key={column.columnNumber}>{column.targetLabel}</th>)}</tr></thead>
              <tbody>
                {mappedPreview.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <th scope="row">{row.rowNumber}</th>
                    {row.values.map((cell, index) => <td key={index}>{cell.formula ? t('import.formulaHidden') : cell.value ?? ''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  )
}
