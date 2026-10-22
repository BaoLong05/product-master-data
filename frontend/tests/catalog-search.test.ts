import { describe, expect, test } from 'bun:test'
import { buildCatalogQuery } from '../src/catalog-search'

describe('buildCatalogQuery', () => {
  test('keeps pagination and combines global search with every non-empty field filter', () => {
    const sourceFields = [
      'dateValue', 'companyName', 'itemName', 'mCode', 'itemCode', 'productType', 'productStatus',
      'approvalStatus', 'sampleOrProductionOrder', 'companyNameLetters', 'oldRegion', 'sampleSavedDate',
      'picImage', 'purchaseOrder', 'productionOrderPdf', 'note', 'printedAt', 'discName', 'soi', 'maso',
      'denier', 'price', 'region', 'quantity', 'picUrl', 'internalItem', 'request',
    ]
    const fields = Object.fromEntries(sourceFields.map((field, index) => [field, `value${index}`]))

    const query = new URLSearchParams(buildCatalogQuery(2, 50, '  wool  ', fields))

    expect(query.get('page')).toBe('2')
    expect(query.get('pageSize')).toBe('50')
    expect(query.get('q')).toBe('wool')
    expect(sourceFields).toHaveLength(27)
    for (const [index, field] of sourceFields.entries()) expect(query.get(field)).toBe(`value${index}`)
  })

  test('omits blank search and filter values', () => {
    const query = new URLSearchParams(buildCatalogQuery(1, 50, '  ', {
      mCode: '  M-001  ',
      note: '',
    }))

    expect(query.has('q')).toBe(false)
    expect(query.get('mCode')).toBe('M-001')
    expect(query.has('note')).toBe(false)
  })
})
