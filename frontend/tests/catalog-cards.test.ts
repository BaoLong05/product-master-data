import { mock, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

type ComponentModule = {
  CatalogRecordCard: (props: {
    record: { id: string; companyName: string | null; picImage: string | null; picUrl: string | null }
    noCompanyLabel: string
    noImageLabel: string
    onSelect: (id: string) => void
  }) => React.ReactElement
  CatalogRecordDetail: (props: {
    record: Record<string, string | number | null>
    fields: { key: string; label: string }[]
    emptyValue: string
    noCompanyLabel: string
    noImageLabel: string
  }) => React.ReactElement
}

async function loadCatalogCards(): Promise<ComponentModule | null> {
  const loaded = await import('../src/' + 'catalog-cards').catch(() => null)
  return loaded as ComponentModule | null
}

const sourceKeys = [
  'dateValue', 'companyName', 'itemName', 'mCode', 'itemCode', 'productType', 'productStatus',
  'approvalStatus', 'sampleOrProductionOrder', 'companyNameLetters', 'oldRegion', 'sampleSavedDate',
  'picImage', 'purchaseOrder', 'productionOrderPdf', 'note', 'printedAt', 'discName', 'soi', 'maso',
  'denier', 'price', 'region', 'quantity', 'picUrl', 'internalItem', 'request',
]

it('renders a company-and-image-only card and activates the selected record', async () => {
  const cards = await loadCatalogCards()
  expect(cards).not.toBeNull()
  if (!cards) return

  const onSelect = mock((_id: string) => undefined)
  const card = cards.CatalogRecordCard({
    record: {
      id: 'record-1',
      companyName: 'Example Company',
      picImage: 'https://cdn.example.com/pic.png',
      picUrl: null,
    },
    noCompanyLabel: 'Unnamed company',
    noImageLabel: 'No PIC image',
    onSelect,
  })
  const markup = renderToStaticMarkup(card)
  expect(card.type).toBe('button')
  expect(markup).toContain('Example Company')
  expect(markup).toContain('src="https://cdn.example.com/pic.png"')
  expect(markup).toContain('loading="lazy"')
  expect(markup).toContain('referrerPolicy="no-referrer"')
  expect(markup).not.toContain('M.CODE')
  ;(card.props as { onClick: () => void }).onClick()
  expect(onSelect).toHaveBeenCalledWith('record-1')
})

it('renders every source field in the selected record detail without changing values', async () => {
  const cards = await loadCatalogCards()
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
