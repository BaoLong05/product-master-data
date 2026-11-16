import { mock, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

type NavigationModule = {
  WorkspaceNavigation: (props: {
    activeView: 'catalog' | 'import'
    labels: { navigation: string; section?: string; catalog: string; import: string }
    onSelect: (view: 'catalog' | 'import') => void
  }) => React.ReactElement
  WorkspacePanel: (props: {
    activeView: 'catalog' | 'import'
    view: 'catalog' | 'import'
    className: string
    ariaLabel: string
    children: string
  }) => React.ReactElement
}

it('shows localized catalog/import navigation and selects the import workspace', async () => {
  const module = await import('../src/' + 'workspace-navigation').catch(() => null)
  expect(module).not.toBeNull()
  if (!module) return

  const WorkspaceNavigation = (module as unknown as NavigationModule).WorkspaceNavigation
  const onSelect = mock(() => {})
  const props = {
    activeView: 'catalog' as const,
    labels: { navigation: 'Workspace navigation', section: 'Library', catalog: 'Catalog', import: 'Excel import' },
    onSelect,
  }
  const navigation = WorkspaceNavigation(props)
  const markup = renderToStaticMarkup(navigation)

  expect(markup).toContain('aria-label="Workspace navigation"')
  expect(markup).toContain('id="vault-sidebar-navigation"')
  expect(markup).toContain('Library')
  expect(markup).toContain('aria-current="page"')
  expect(markup).toContain('Catalog')
  expect(markup).toContain('Excel import')
  expect(markup).toContain('aria-label="Excel import"')
  expect(markup).toContain('<svg aria-hidden="true"')

  const buttons = navigation.props.children as React.ReactElement[]
  const importButton = buttons.find((button) => button?.props['data-view'] === 'import')
  expect(importButton).toBeDefined()
  importButton?.props.onClick()
  expect(onSelect).toHaveBeenCalledWith('import')
})

it('renders only the active workspace panel', async () => {
  const module = await import('../src/' + 'workspace-navigation').catch(() => null) as NavigationModule | null
  expect(module?.WorkspacePanel).toBeFunction()
  if (!module) return

  const hiddenPanel = module.WorkspacePanel({ activeView: 'catalog', view: 'import', className: 'import-workspace', ariaLabel: 'Excel import', children: 'Import UI' })
  const visiblePanel = module.WorkspacePanel({ activeView: 'catalog', view: 'catalog', className: 'catalog-workspace', ariaLabel: 'Catalog', children: 'Company cards' })
  expect(hiddenPanel.props.hidden).toBe(true)
  expect(visiblePanel.props.hidden).toBe(false)
  expect(renderToStaticMarkup(hiddenPanel)).toContain('Import UI')
  expect(renderToStaticMarkup(hiddenPanel)).toContain('hidden=""')
})
