import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'bun:test'
import { ImportColumnMapping } from '../src/import-column-mapping-view'

const fields = [
  { key: 'mCode', label: 'M.CODE' },
  { key: 'note', label: 'Note' },
]
const onChange = () => undefined

describe('ImportColumnMapping', () => {
  test('renders accessible unmapped selectors and explains the temporary preview-only behavior', () => {
    const markup = renderToStaticMarkup(createElement(ImportColumnMapping, {
      headers: ['M.CODE', 'Unfamiliar'],
      fields,
      mapping: {},
      onChange,
    }))

    expect(markup).toContain('role="status" aria-live="polite"')
    expect(markup).toContain('Ánh xạ cột')
    expect(markup.match(/<option value="" selected="">Không ánh xạ<\/option>/g)).toHaveLength(2)
    expect(markup).toContain('chỉ được lưu tạm trong màn hình')
    expect(markup).toContain('Chưa ánh xạ cột nào.')
    expect(markup).not.toContain('Dữ liệu theo ánh xạ')
  })

  test('shows explicitly selected targets and previews raw rows without formula values', () => {
    const markup = renderToStaticMarkup(createElement(ImportColumnMapping, {
      headers: ['M.CODE', 'Note'],
      fields,
      mapping: { 1: 'mCode', 2: 'note' },
      rows: [{ rowNumber: 7, values: ['0012', 'cached-secret'], formulaColumns: [2] }],
      onChange,
    }))

    expect(markup).toContain('Dữ liệu theo ánh xạ')
    expect(markup).toContain('2 cột được ánh xạ tạm thời.')
    expect(markup).toContain('<option value="mCode" selected="">M.CODE</option>')
    expect(markup).toContain('<option value="note" selected="">Note</option>')
    expect(markup).toContain('0012')
    expect(markup).toContain('Công thức bị ẩn')
    expect(markup).not.toContain('cached-secret')
    expect(markup).toContain('7')
  })

  test('disables a target already selected for another source column', () => {
    const markup = renderToStaticMarkup(createElement(ImportColumnMapping, {
      headers: ['M.CODE', 'Another source'],
      fields,
      mapping: { 1: 'mCode' },
      onChange,
    }))

    expect(markup).toContain('<option value="mCode" disabled="">M.CODE</option>')
  })
})
