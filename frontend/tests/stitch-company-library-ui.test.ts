import { readFileSync } from 'node:fs'
import { mock, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

const appMarkup = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

type GalleryModule = {
  CatalogRecordGallery: (props: {
    records: {
      id: string
      companyName: string | null
      itemName: string | null
      mCode: string | null
      itemCode: string | null
      productType: string | null
      productStatus: string | null
      purchaseOrder: string | null
      picImage: string | null
      picUrl: string | null
    }[]
    labels: {
      caption: string
      open: string
      itemCode: string
      mCode: string
      noCompany: string
      noImage: string
      emptyValue: string
    }
    onSelect: (id: string) => void
  }) => React.ReactElement
}

function findElementByClass(node: unknown, className: string): { props: Record<string, unknown> } | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElementByClass(child, className)
      if (found) return found
    }
    return null
  }
  if (!node || typeof node !== 'object' || !('props' in node)) return null
  const element = node as { props: { className?: unknown; children?: unknown } }
  if (element.props.className === className) return element as { props: Record<string, unknown> }
  return findElementByClass(element.props.children, className)
}

const labels = {
  caption: 'Product image gallery', open: 'Open record', itemCode: 'Item Code', mCode: 'M.CODE',
  noCompany: 'Unnamed company', noImage: 'No image', emptyValue: 'Not provided',
}

it('renders photo-first item cards from paginated records and opens the chosen detail', async () => {
  const module = await import('../src/' + 'catalog-record-gallery').catch(() => null) as GalleryModule | null
  expect(module?.CatalogRecordGallery).toBeFunction()
  if (!module) return

  const onSelect = mock((_id: string) => undefined)
  const component = module.CatalogRecordGallery({
    records: [{
      id: 'record-9', companyName: 'Example Textile', itemName: 'Woven label', mCode: 'M-09',
      itemCode: 'IT-09', productType: 'Woven', productStatus: 'Active', purchaseOrder: 'PO-09',
      picImage: 'https://drive.google.com/uc?id=pic-9', picUrl: null,
    }],
    labels,
    onSelect,
  })
  const markup = renderToStaticMarkup(component)
  expect(markup).toContain('role="list"')
  expect(markup).toContain('role="listitem"')
  expect(markup).toContain('class="catalog-gallery-image"')
  expect(markup).toContain('src="https://drive.google.com/uc?id=pic-9"')
  expect(markup).toContain('Woven label')
  expect(markup).toContain('IT-09')
  expect(markup).toContain('M-09')
  expect(markup).not.toContain('<table')
  const openButton = findElementByClass(component, 'catalog-gallery-card-open')
  expect(openButton).not.toBeNull()
  if (typeof openButton?.props.onClick === 'function') openButton.props.onClick()
  expect(onSelect).toHaveBeenCalledWith('record-9')
})

it('localizes missing image and code values in the gallery', async () => {
  const module = await import('../src/' + 'catalog-record-gallery') as GalleryModule
  const component = module.CatalogRecordGallery({
    records: [{
      id: 'record-empty', companyName: null, itemName: null, mCode: null, itemCode: null,
      productType: null, productStatus: null, purchaseOrder: null, picImage: null, picUrl: null,
    }],
    labels,
    onSelect: () => undefined,
  })
  const markup = renderToStaticMarkup(component)
  expect(markup).toContain('aria-label="No image"')
  expect(markup.match(/Not provided/g)).toHaveLength(5)
  expect(markup).toContain('Unnamed company')
})

it('uses the photo-first gallery within the supported application shell', () => {
  expect(appMarkup).toMatch(/className=\{`vault-app-shell/)
  expect(appMarkup).toContain('className="vault-sidebar"')
  expect(appMarkup).toContain('CatalogRecordGallery')
  expect(appMarkup).not.toContain('CatalogRecordTable')
  expect(appMarkup).toContain('<CatalogRecordDetail')
  expect(appMarkup).toContain('<RecordAuditHistory')
  expect(appMarkup).toContain('<ImportColumnMappingView')
})