import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'bun:test'
import { ImportHeaderDiagnostics } from '../src/import-header-diagnostics'

describe('ImportHeaderDiagnostics', () => {
  test('announces header findings and makes clear that recognition is not mapping', () => {
    const markup = renderToStaticMarkup(createElement(ImportHeaderDiagnostics, {
      headers: ['M.CODE', 'M.CODE', 'Unmapped', null],
    }))

    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain('Đối chiếu tiêu đề cột')
    expect(markup).toContain('1/27 tiêu đề nguồn')
    expect(markup).toContain('Đã nhận diện')
    expect(markup).toContain('Trùng tiêu đề')
    expect(markup).toContain('Chưa nhận diện')
    expect(markup).toContain('Tiêu đề trống')
    expect(markup).toContain('chưa tự ánh xạ')
    expect(markup).toContain('Unmapped')
  })
})
