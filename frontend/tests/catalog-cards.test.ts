import { mock, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

type ComponentModule = {
  CatalogCustomerCard: (props: {
    customer: { name: string; itemCount: number; picImage: string | null; picUrl: string | null }
    itemCountLabel: (count: number) => string
    noImageLabel: string
    noCompanyLabel: string
    onSelect: (name: string) => void
  }) => React.ReactElement
  CatalogItemCard: (props: {
    record: { id: string; companyName: string | null; itemName: string | null; itemCode: string | null; mCode: string | null; picImage: string | null; picUrl: string | null }
    noCompanyLabel: string
    noItemLabel: string
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

it('renders customer library cards and item cards with a prominent PIC', async () => {
  const cards = await loadCatalogCards()
  expect(cards).not.toBeNull()
  if (!cards) return

  const onCustomerSelect = mock((_name: string) => undefined)
  const customer = cards.CatalogCustomerCard({
    customer: { name: 'BLUE HORIZON CO. LTD', itemCount: 12, picImage: 'https://cdn.example.com/customer.png', picUrl: null },
    itemCountLabel: (count) => `${count} items`,
    noImageLabel: 'No PIC image',
    noCompanyLabel: 'Unnamed company',
    onSelect: onCustomerSelect,
  })
  const customerMarkup = renderToStaticMarkup(customer)
  expect(customerMarkup).toContain('BLUE HORIZON CO. LTD')
  expect(customerMarkup).toContain('12 items')
  expect(customerMarkup).toContain('src="https://cdn.example.com/customer.png"')
  ;(customer.props as { onClick: () => void }).onClick()
  expect(onCustomerSelect).toHaveBeenCalledWith('BLUE HORIZON CO. LTD')

  const onItemSelect = mock((_id: string) => undefined)
  const item = cards.CatalogItemCard({
    record: { id: 'item-1', companyName: 'BLUE HORIZON CO. LTD', itemName: 'HANGTAG', itemCode: 'BL-HT-001', mCode: 'BL-TMP-01', picImage: null, picUrl: 'https://drive.google.com/file/d/abc/view' },
    noCompanyLabel: 'Unnamed company',
    noItemLabel: 'Unnamed item',
    noImageLabel: 'No PIC image',
    onSelect: onItemSelect,
  })
  const itemMarkup = renderToStaticMarkup(item)
  expect(itemMarkup).toContain('HANGTAG')
  expect(itemMarkup).toContain('BL-HT-001')
  expect(itemMarkup).toContain('BL-TMP-01')
  expect(itemMarkup).toContain('catalog-record-photo')
  ;(item.props as { onClick: () => void }).onClick()
  expect(onItemSelect).toHaveBeenCalledWith('item-1')
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
