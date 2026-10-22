import type { ReactNode } from 'react'
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
  const mappedPreview = buildMappedImportPreview(headers, rows ?? [], mapping, fields)

  return (
    <section className="import-column-mapping" aria-labelledby="import-column-mapping-title">
      <h3 id="import-column-mapping-title">Ánh xạ cột tạm thời</h3>
      <p>Chọn trường đích cho từng cột; không có lựa chọn nào được điền sẵn. Mỗi trường chỉ ánh xạ với một cột. Lựa chọn chỉ được lưu tạm trong màn hình này, chưa gửi hoặc nhập dữ liệu.</p>
      <p className="import-mapping-status" role="status" aria-live="polite">
        {mappedPreview.columns.length === 0 ? 'Chưa ánh xạ cột nào.' : `${mappedPreview.columns.length} cột được ánh xạ tạm thời.`}
      </p>
      <div className="import-mapping-grid">
        {headers.map((header, index) => {
          const columnNumber = index + 1
          const selectableKeys = new Set(availableImportTargetFields(fields, mapping, columnNumber).map(({ key }) => key))
          return (
            <div className="import-mapping-field" key={columnNumber}>
              <label htmlFor={`import-map-column-${columnNumber}`}>Cột {columnNumber}: {header || '(trống)'} → trường hồ sơ</label>
              <select
                id={`import-map-column-${columnNumber}`}
                value={mapping[columnNumber] ?? ''}
                onChange={(event) => onChange(columnNumber, event.currentTarget.value)}
              >
                <option value="">Không ánh xạ</option>
                {fields.map(({ key, label }) => (
                  <option key={key} value={key} disabled={!selectableKeys.has(key)}>{label}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
      {mappedPreview.columns.length > 0 && (!rows ? (
        <p className="import-mapping-message">Xem tối đa 10 dòng đầu để kiểm tra dữ liệu theo ánh xạ.</p>
      ) : rows.length === 0 ? (
        <p className="import-mapping-message">Worksheet không có dòng dữ liệu mẫu để xem theo ánh xạ.</p>
      ) : (
        <div className="import-mapped-preview">
          <h4>Dữ liệu theo ánh xạ (chưa xác thực hoặc nhập)</h4>
          <div className="import-mapped-preview-scroll">
            <table className="import-mapped-table">
              <caption className="sr-only">Tối đa 10 dòng mẫu, sắp theo trường đích đã chọn; không được xác thực hoặc nhập</caption>
              <thead><tr><th scope="col">Dòng Excel</th>{mappedPreview.columns.map((column) => <th scope="col" key={column.columnNumber}>{column.targetLabel}</th>)}</tr></thead>
              <tbody>
                {mappedPreview.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <th scope="row">{row.rowNumber}</th>
                    {row.values.map((cell, index) => <td key={index}>{cell.formula ? 'Công thức bị ẩn' : cell.value ?? ''}</td>)}
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
