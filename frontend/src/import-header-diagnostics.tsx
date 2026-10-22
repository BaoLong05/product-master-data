import type { ReactNode } from 'react'
import { analyzeImportHeaders, importSourceHeaderCount } from './import-headers'

export function ImportHeaderDiagnostics({ headers }: { headers: readonly (string | null)[] }): ReactNode {
  const analysis = analyzeImportHeaders(headers)
  const recognizedCount = importSourceHeaderCount - analysis.missingHeaders.length

  return (
    <section className="import-header-diagnostics" aria-live="polite" aria-labelledby="import-header-diagnostics-title">
      <h3 id="import-header-diagnostics-title">Đối chiếu tiêu đề cột</h3>
      <p>{recognizedCount}/{importSourceHeaderCount} tiêu đề nguồn được nhận diện chính xác.</p>
      <ol className="import-header-list">
        {analysis.columns.map(({ columnNumber, header, recognized, duplicate, blank }) => (
          <li key={columnNumber}>
            <span className="import-header-name">Cột {columnNumber}: {header || '(trống)'}</span>
            <span className="import-header-statuses">
              {recognized && <span>Đã nhận diện</span>}
              {duplicate && <span>Trùng tiêu đề</span>}
              {blank && <span>Tiêu đề trống</span>}
              {!recognized && !blank && <span>Chưa nhận diện</span>}
            </span>
          </li>
        ))}
      </ol>
      {analysis.missingHeaders.length > 0 && (
        <details className="import-missing-headers">
          <summary>Thiếu {analysis.missingHeaders.length} tiêu đề nguồn</summary>
          <ul>{analysis.missingHeaders.map((header) => <li key={header}>{header}</li>)}</ul>
        </details>
      )}
      <p className="import-preview-note">Các tiêu đề được nhận diện chưa tự ánh xạ vào trường dữ liệu. Chưa có xác thực hoặc nhập hồ sơ.</p>
    </section>
  )
}
