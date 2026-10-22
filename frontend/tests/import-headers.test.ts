import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { analyzeImportHeaders } from '../src/import-headers'

describe('analyzeImportHeaders', () => {
  test('recognizes exact source headers and reports absent source headers', () => {
    const result = analyzeImportHeaders(['M.CODE', 'Item Name'])

    expect(result.columns).toEqual([
      { columnNumber: 1, header: 'M.CODE', recognized: true, duplicate: false, blank: false },
      { columnNumber: 2, header: 'Item Name', recognized: true, duplicate: false, blank: false },
    ])
    expect(result.missingHeaders).toContain('Date')
    expect(result.missingHeaders).not.toContain('M.CODE')
    expect(result.unrecognizedColumns).toEqual([])
  })

  test('marks every repeated header and keeps unfamiliar and blank columns distinct', () => {
    const result = analyzeImportHeaders(['M.CODE', 'M.CODE', ' M.CODE ', null, 'Mystery'])

    expect(result.columns.map(({ duplicate, blank }) => ({ duplicate, blank }))).toEqual([
      { duplicate: true, blank: false },
      { duplicate: true, blank: false },
      { duplicate: false, blank: false },
      { duplicate: false, blank: true },
      { duplicate: false, blank: false },
    ])
    expect(result.unrecognizedColumns).toEqual([
      { columnNumber: 3, header: ' M.CODE ' },
      { columnNumber: 5, header: 'Mystery' },
    ])
    expect(result.missingHeaders).not.toContain('M.CODE')
  })

  test('recognizes all 27 source headers in the canonical import specification', () => {
    const dataSpec = readFileSync(new URL('../../docs/data-and-import.md', import.meta.url), 'utf8')
    const sourceSection = dataSpec.split('## Source columns')[1]?.split('## Decisions')[0] ?? ''
    const sourceHeaders = Array.from(sourceSection.matchAll(/^\d+\.\s+(.+)$/gm), ([, header]) => header)

    const result = analyzeImportHeaders(sourceHeaders)

    expect(sourceHeaders).toHaveLength(27)
    expect(result.columns.every((column) => column.recognized)).toBe(true)
    expect(result.missingHeaders).toEqual([])
    expect(result.unrecognizedColumns).toEqual([])
  })
})
