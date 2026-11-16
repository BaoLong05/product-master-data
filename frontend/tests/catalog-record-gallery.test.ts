import { expect, it, mock } from 'bun:test'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'

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
  caption: 'Product image gallery', open: 'Open product',
  itemCode: 'Item Code', mCode: 'M.CODE', noCompany: 'Unnamed company', noImage: 'No PIC image', emptyValue: 'Not provided',
}
const record = {
  id: 'record-9', companyName: 'Example Textile', itemName: 'Woven label', mCode: 'M-09',
  itemCode: 'IT-09', productType: 'Woven', productStatus: 'Active', purchaseOrder: 'PO-09',
  picImage: 'https://drive.google.com/uc?id=pic-9', picUrl: null,
}

it('shows a large PIC and identifying item codes, and selecting its card opens that record', async () => {
  const module = await import('../src/' + 'catalog-record-gallery').catch(() => null) as GalleryModule | null
  expect(module?.CatalogRecordGallery).toBeFunction()
  if (!module) return

  const onSelect = mock((_id: string) => undefined)
  const component = module.CatalogRecordGallery({ records: [record], labels, onSelect })
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

it('exposes a localized missing-PIC fallback and preserves secondary PIC URL fallback', async () => {
  const module = await import('../src/' + 'catalog-record-gallery') as GalleryModule
  const component = module.CatalogRecordGallery({
    records: [
      { ...record, id: 'missing', picImage: null, picUrl: null },
      { ...record, id: 'secondary', picImage: 'javascript:alert(1)', picUrl: 'https://images.example.org/item.jpg' },
    ],
    labels,
    onSelect: () => undefined,
  })
  const markup = renderToStaticMarkup(component)
  expect(markup).toContain('aria-label="No PIC image"')
  expect(markup).toContain('src="https://images.example.org/item.jpg"')
  expect(markup).not.toContain('javascript:')
})

it('gives the photo-first catalog a responsive grid and uncropped image treatment', () => {
  const styles = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
  expect(styles).toMatch(/\.catalog-gallery-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill/)
  expect(styles).toMatch(/\.catalog-gallery-image\s*\{[^}]*object-fit:\s*contain/)
  expect(styles).toMatch(/\.catalog-gallery-photo\s*\{[^}]*aspect-ratio:/)
  expect(styles).toMatch(/\.catalog-gallery-card-open:focus-visible/)
})
