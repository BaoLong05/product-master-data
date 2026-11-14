import { useState, type MouseEvent } from 'react'
import { createElement } from 'react'
import { resolvePicImageUrl } from './pic-image-url'

export type CatalogCardRecord = {
  id: string
  companyName: string | null
  itemName?: string | null
  itemCode?: string | null
  mCode?: string | null
  picImage: string | null
  picUrl: string | null
}

export type CatalogCustomer = {
  name: string
  itemCount: number
  picImage: string | null
  picUrl: string | null
}

export type CatalogDetailField<TRecord extends object> = {
  key: Extract<keyof TRecord, string>
  label: string
}

function CatalogImage({
  picImage,
  picUrl,
  noImageLabel,
}: {
  picImage: string | null
  picUrl: string | null
  noImageLabel: string
}) {
  const imageUrl = resolvePicImageUrl(picImage, picUrl)
  return createElement('span', { className: 'catalog-record-photo' },
    createElement('span', {
      className: 'catalog-record-image-fallback',
      role: 'img',
      'aria-label': noImageLabel,
      'aria-hidden': imageUrl ? true : undefined,
    }, '▧'),
    imageUrl && createElement('img', {
      className: 'catalog-record-image',
      src: imageUrl,
      alt: '',
      loading: 'lazy',
      decoding: 'async',
      referrerPolicy: 'no-referrer',
      onError: (event: { currentTarget: HTMLImageElement }) => { event.currentTarget.hidden = true },
    }),
  )
}

function CatalogZoomImage({
  picImage,
  picUrl,
  noImageLabel,
}: {
  picImage: string | null
  picUrl: string | null
  noImageLabel: string
}) {
  const imageUrl = resolvePicImageUrl(picImage, picUrl)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const zoomLevels = [1, 2.5, 4, 5] as const

  const handleMouseMove = (event: MouseEvent<HTMLSpanElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    setPosition({
      x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
    })
  }

  return createElement('div', { className: 'catalog-detail-visual' },
    createElement('span', {
      className: `catalog-record-photo catalog-detail-zoom${zoom > 1 ? ' is-zoomed' : ''}`,
      onMouseMove: handleMouseMove,
      onMouseLeave: () => setPosition({ x: 50, y: 50 }),
    },
    createElement('span', {
      className: 'catalog-record-image-fallback',
      role: 'img',
      'aria-label': noImageLabel,
      'aria-hidden': imageUrl ? true : undefined,
    }, '▧'),
    imageUrl && createElement('img', {
      className: 'catalog-record-image catalog-detail-zoom-image',
      src: imageUrl,
      alt: '',
      loading: 'eager',
      decoding: 'async',
      referrerPolicy: 'no-referrer',
      style: { transform: `scale(${zoom})`, transformOrigin: `${position.x}% ${position.y}%` },
      onError: (event: { currentTarget: HTMLImageElement }) => { event.currentTarget.hidden = true },
    })),
    createElement('div', { className: 'catalog-zoom-controls', role: 'group', 'aria-label': 'Image zoom' },
      zoomLevels.map((level) => createElement('button', {
        type: 'button',
        className: zoom === level ? 'is-active' : undefined,
        'aria-pressed': zoom === level,
        'aria-label': `Zoom ${level}x`,
        onClick: () => setZoom(level),
        key: level,
      }, `${level}×`))),
  )
}

export function CatalogCustomerCard({
  customer,
  itemCountLabel,
  noImageLabel,
  noCompanyLabel,
  onSelect,
}: {
  customer: CatalogCustomer
  itemCountLabel: (count: number) => string
  noImageLabel: string
  noCompanyLabel: string
  onSelect: (name: string) => void
}) {
  const customerName = customer.name.trim() || noCompanyLabel
  return createElement('button', {
    type: 'button',
    className: 'catalog-record-card catalog-customer-card',
    'aria-label': customerName,
    onClick: () => onSelect(customer.name),
  },
  createElement(CatalogImage, { picImage: customer.picImage, picUrl: customer.picUrl, noImageLabel }),
  createElement('span', { className: 'catalog-record-company' }, customerName),
  createElement('span', { className: 'catalog-item-count' }, itemCountLabel(customer.itemCount)))
}

export function CatalogItemCard({
  record,
  noCompanyLabel,
  noItemLabel,
  noImageLabel,
  onSelect,
}: {
  record: CatalogCardRecord
  noCompanyLabel: string
  noItemLabel: string
  noImageLabel: string
  onSelect: (id: string) => void
}) {
  const companyName = record.companyName?.trim() || noCompanyLabel
  const itemName = record.itemName?.trim() || noItemLabel
  return createElement('button', {
    type: 'button',
    className: 'catalog-record-card catalog-item-card',
    'aria-label': `${itemName} — ${companyName}`,
    onClick: () => onSelect(record.id),
  },
  createElement(CatalogImage, { picImage: record.picImage, picUrl: record.picUrl, noImageLabel }),
  createElement('span', { className: 'catalog-item-name' }, itemName),
  createElement('span', { className: 'catalog-item-meta' }, [record.itemCode, record.mCode].filter(Boolean).join(' · ')))
}

export function CatalogRecordDetail<TRecord extends object>({
  record,
  fields,
  emptyValue,
  noCompanyLabel,
  noImageLabel,
}: {
  record: TRecord
  fields: readonly CatalogDetailField<TRecord>[]
  emptyValue: string
  noCompanyLabel: string
  noImageLabel: string
}) {
  const values = record as unknown as Record<string, unknown>
  const companyName = typeof values.companyName === 'string' && values.companyName.trim()
    ? values.companyName
    : noCompanyLabel
  const picImage = typeof values.picImage === 'string' ? values.picImage : null
  const picUrl = typeof values.picUrl === 'string' ? values.picUrl : null

  return createElement('section', { className: 'catalog-record-detail', 'aria-labelledby': 'catalog-record-detail-title' },
    createElement('div', { className: 'catalog-record-detail-heading' },
      createElement(CatalogZoomImage, { picImage, picUrl, noImageLabel }),
      createElement('h2', { id: 'catalog-record-detail-title' }, companyName)),
    createElement('dl', { className: 'record-detail-grid' },
      fields.map(({ key, label }) => {
        const value = values[key]
        const text = typeof value === 'string' && value.length > 0 ? value : emptyValue
        return createElement('div', { className: 'record-detail-field', key },
          createElement('dt', null, label),
          createElement('dd', null, text))
      })))
}