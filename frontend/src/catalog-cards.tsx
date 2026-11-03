import { createElement } from 'react'
import { resolvePicImageUrl } from './pic-image-url'

export type CatalogCardRecord = {
  id: string
  companyName: string | null
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

export function CatalogRecordCard({
  record,
  noCompanyLabel,
  noImageLabel,
  onSelect,
}: {
  record: CatalogCardRecord
  noCompanyLabel: string
  noImageLabel: string
  onSelect: (id: string) => void
}) {
  const companyName = record.companyName?.trim() || noCompanyLabel
  return createElement('button', {
    type: 'button',
    className: 'catalog-record-card',
    'aria-label': companyName,
    onClick: () => onSelect(record.id),
  },
  createElement(CatalogImage, {
    picImage: record.picImage,
    picUrl: record.picUrl,
    noImageLabel,
  }),
  createElement('span', { className: 'catalog-record-company' }, companyName))
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
      createElement(CatalogImage, { picImage, picUrl, noImageLabel }),
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
