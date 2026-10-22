import { describe, expect, test } from 'bun:test'
import {
  availableImportTargetFields,
  buildMappedImportPreview,
  updateImportColumnMapping,
} from '../src/import-column-mapping'

const fields = [
  { key: 'mCode', label: 'M.CODE' },
  { key: 'note', label: 'Note' },
]

describe('import column mapping', () => {
  test('uses the target explicitly selected for a source column', () => {
    const mapping = updateImportColumnMapping({}, 1, 'mCode', fields)
    const preview = buildMappedImportPreview(['M.CODE'], [], mapping, fields)

    expect(preview.columns).toEqual([{
      columnNumber: 1,
      targetLabel: 'M.CODE',
    }])
    expect(preview.rows).toEqual([])
  })

  test('assigns, changes, clears, and rejects invalid or duplicate targets', () => {
    const initial = {}
    const assigned = updateImportColumnMapping(initial, 1, 'mCode', fields)

    expect(assigned).toEqual({ 1: 'mCode' })
    expect(updateImportColumnMapping(assigned, 2, 'mCode', fields)).toEqual(assigned)
    expect(updateImportColumnMapping(assigned, 2, 'unknown', fields)).toEqual(assigned)
    expect(updateImportColumnMapping(assigned, 0, 'note', fields)).toEqual(assigned)
    expect(updateImportColumnMapping(assigned, 1, 'note', fields)).toEqual({ 1: 'note' })
    expect(updateImportColumnMapping(assigned, 1, '', fields)).toEqual({})
  })

  test('keeps each column selectable without offering fields assigned elsewhere', () => {
    const mapping = { 1: 'mCode' }

    expect(availableImportTargetFields(fields, mapping, 1).map(({ key }) => key)).toEqual(['mCode', 'note'])
    expect(availableImportTargetFields(fields, mapping, 2).map(({ key }) => key)).toEqual(['note'])
  })

  test('previews explicitly mapped raw values in source order and masks formula values', () => {
    const preview = buildMappedImportPreview(
      ['M.CODE', 'Note', 'Extra'],
      [{ rowNumber: 7, values: ['0012', 'cached-secret', 'ignored'], formulaColumns: [2] }],
      { 2: 'note', 1: 'mCode' },
      fields,
    )

    expect(preview.columns.map(({ columnNumber, targetLabel }) => ({ columnNumber, targetLabel }))).toEqual([
      { columnNumber: 1, targetLabel: 'M.CODE' },
      { columnNumber: 2, targetLabel: 'Note' },
    ])
    expect(preview.rows).toEqual([{
      rowNumber: 7,
      values: [
        { value: '0012', formula: false },
        { value: null, formula: true },
      ],
    }])
  })
})
