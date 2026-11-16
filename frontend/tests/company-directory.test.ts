import { expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildCompanyQuery } from '../src/company-search'

type DirectoryModule = {
  CompanyDirectory: (props: {
    companies: { companyName: string | null; itemCount: number }[]
    labels: { caption: string; open: string; noCompany: string; itemCount: string }
    onSelect: (company: { companyName: string | null; itemCount: number }) => void
  }) => React.ReactElement
}

test('company library shows each company once and opens its item collection', async () => {
  const module = await import('../src/' + 'company-directory').catch(() => null) as DirectoryModule | null
  expect(module?.CompanyDirectory).toBeFunction()
  if (!module) return

  const selected = mock((_company: { companyName: string | null; itemCount: number }) => undefined)
  const companies = [
    { companyName: 'BLUE HORIZON CO. LTD', itemCount: 18 },
    { companyName: null, itemCount: 3 },
  ]
  const component = module.CompanyDirectory({
    companies,
    labels: { caption: 'Company library', open: 'Open company', noCompany: 'No company name', itemCount: '{count} items' },
    onSelect: selected,
  })
  const markup = renderToStaticMarkup(component)
  expect(markup).toContain('BLUE HORIZON CO. LTD')
  expect(markup).toContain('18 items')
  expect(markup).toContain('No company name')
  expect(markup).toContain('role="list"')
  expect(markup).not.toContain('<img')

  const firstButton = (component.props.children as React.ReactElement[])[0].props.children as React.ReactElement
  firstButton.props.onClick()
  expect(selected).toHaveBeenCalledWith(companies[0])
})

test('company directory query encodes search and paginates company groups', async () => {
  const query = new URLSearchParams(buildCompanyQuery(2, 50, '  CÔNG TY  '))
  expect(query.get('page')).toBe('2')
  expect(query.get('pageSize')).toBe('50')
  expect(query.get('q')).toBe('CÔNG TY')
})
