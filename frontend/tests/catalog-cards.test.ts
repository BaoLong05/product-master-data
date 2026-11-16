import { expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

type ComponentModule = {

  CatalogRecordDetail: (props: {
    record: Record<string, string | number | null>
    fields: { key: string; label: string }[]
    emptyValue: string
    noCompanyLabel: string
    noImageLabel: string
  }) => React.ReactElement
}

async function loadCatalogDetail(): Promise<ComponentModule | null> {
  const loaded = await import('../src/' + 'catalog-cards').catch(() => null)
  return loaded as ComponentModule | null
}

const sourceKeys = [
  'dateValue', 'companyName', 'itemName', 'mCode', 'itemCode', 'productType', 'productStatus',
  'approvalStatus', 'sampleOrProductionOrder', 'companyNameLetters', 'oldRegion', 'sampleSavedDate',
  'picImage', 'purchaseOrder', 'productionOrderPdf', 'note', 'printedAt', 'discName', 'soi', 'maso',
  'denier', 'price', 'region', 'quantity', 'picUrl', 'internalItem', 'request',
]

it('renders every source field in the selected record detail without changing values', async () => {
  const cards = await loadCatalogDetail()
  expect(cards).not.toBeNull()
  if (!cards) return

  const record = Object.fromEntries(sourceKeys.map((key) => [key, `stored:${key}`]))
  const fields = sourceKeys.map((key) => ({ key, label: `label:${key}` }))
  const detail = cards.CatalogRecordDetail({
    record: { ...record, id: 'record-1', version: 3 },
    fields,
    emptyValue: '—',
    noCompanyLabel: 'Unnamed company',
    noImageLabel: 'No PIC image',
  })
  const markup = renderToStaticMarkup(detail)
  for (const key of sourceKeys) {
    expect(markup).toContain(`label:${key}`)
    expect(markup).toContain(`stored:${key}`)
  }
  expect((markup.match(/<dt/g) ?? [])).toHaveLength(27)
})
