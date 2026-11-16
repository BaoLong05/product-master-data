import { createElement } from 'react'
import { resolvePicImageUrl } from './pic-image-url'

export type CatalogGalleryRecord = {
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
}

type CatalogRecordGalleryProps = {
  records: CatalogGalleryRecord[]
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
}

function CatalogImage({ record, label }: { record: CatalogGalleryRecord; label: string }) {
  const imageUrl = resolvePicImageUrl(record.picImage, record.picUrl)
  const description = [record.itemName, record.itemCode].filter(Boolean).join(' · ')
  return createElement('figure', { className: 'catalog-gallery-photo' },
    createElement('span', {
      className: 'catalog-gallery-image-fallback',
      role: 'img',
      'aria-label': label,
      'aria-hidden': imageUrl ? true : undefined,
    }, '▧'),
    imageUrl && createElement('img', {
      className: 'catalog-gallery-image',
      src: imageUrl,
      alt: description || label,
      loading: 'lazy',
      decoding: 'async',
      referrerPolicy: 'no-referrer',
      onError: (event: { currentTarget: HTMLImageElement }) => { event.currentTarget.hidden = true },
    }))
}

export function CatalogRecordGallery({ records, labels, onSelect }: CatalogRecordGalleryProps) {
  return createElement('div', { className: 'catalog-gallery-grid', role: 'list', 'aria-label': labels.caption },
    records.map((record) => {
      const itemName = record.itemName?.trim() || labels.emptyValue
      const companyName = record.companyName?.trim() || labels.noCompany
      const accessibleLabel = `${labels.open}: ${itemName} · ${record.itemCode || labels.emptyValue}`
      return createElement('article', { className: 'catalog-gallery-card', key: record.id, role: 'listitem' },
        createElement('button', {
          className: 'catalog-gallery-card-open',
          type: 'button',
          'aria-label': accessibleLabel,
          onClick: () => onSelect(record.id),
        },
        createElement(CatalogImage, { record, label: labels.noImage }),
        createElement('div', { className: 'catalog-gallery-card-details' },
          createElement('span', { className: 'catalog-gallery-company' }, companyName),
          createElement('h3', null, itemName),
          createElement('dl', { className: 'catalog-gallery-identifiers' },
            createElement('div', null,
              createElement('dt', null, labels.itemCode),
              createElement('dd', null, record.itemCode || labels.emptyValue)),
            createElement('div', null,
              createElement('dt', null, labels.mCode),
              createElement('dd', null, record.mCode || labels.emptyValue))))))
    }))
}
