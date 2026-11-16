import { createElement, type ReactElement } from 'react'

export type CompanyDirectoryItem = { companyName: string | null; itemCount: number }

type CompanyDirectoryProps = {
  companies: CompanyDirectoryItem[]
  labels: { caption: string; open: string; noCompany: string; itemCount: string }
  onSelect: (company: CompanyDirectoryItem) => void
}

export function CompanyDirectory({ companies, labels, onSelect }: CompanyDirectoryProps): ReactElement {
  return createElement('ul', { className: 'company-directory', role: 'list', 'aria-label': labels.caption },
    ...companies.map((company) => createElement('li', { className: 'company-directory-item', key: company.companyName ?? 'unassigned' },
      createElement('button', {
        className: 'company-directory-button',
        type: 'button',
        'aria-label': `${labels.open}: ${company.companyName ?? labels.noCompany}`,
        onClick: () => onSelect(company),
      },
      createElement('span', { className: 'company-directory-name' }, company.companyName ?? labels.noCompany),
      createElement('span', { className: 'company-directory-count' }, labels.itemCount.replace('{count}', String(company.itemCount))),
      ),
    )),
  )
}
