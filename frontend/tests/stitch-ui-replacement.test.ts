import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const navigation = readFileSync(new URL('../src/workspace-navigation.tsx', import.meta.url), 'utf8')
const appStyles = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
const globalStyles = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const styles = `${globalStyles}\n${appStyles}`

describe('Stitch UI replacement acceptance', () => {
  test('replaces legacy frames with the reference-inspired application shell', () => {
    expect(app).toMatch(/className=\{`vault-app-shell/)
    expect(app).toContain('className="vault-sidebar"')
    expect(app).toContain('className="vault-topbar"')
    expect(app).toContain('className="vault-header-search"')
    expect(app).not.toContain('className="library-shell"')
    expect(app).not.toContain('className="login-layout"')
    expect(app).not.toContain('className="app-footer"')
    expect(appStyles).not.toContain('.library-shell')
    expect(appStyles).not.toContain('.login-story')
  })

  test('keeps the sidebar limited to supported destinations with accessible collapse state', () => {
    expect(navigation.match(/className: 'workspace-tab'/g)).toHaveLength(2)
    expect(app).toContain('aria-expanded={!sidebarCollapsed}')
    expect(app).toContain('aria-expanded={mobileNavOpen}')
    expect(app).toContain('aria-controls="vault-sidebar-navigation"')
    expect(app).not.toMatch(/QA Lead|3\.9\s*\/\s*5\.0\s*TB|25 mẫu lưu trữ|Tổng quan Năm/)
  })

  test('header search updates text without applying field-filter drafts', () => {
    const headerSearchSubmit = app.match(/<form className="vault-header-search" onSubmit=\{([^}]+)\}>/)?.[1]
    const filterSearchSubmit = app.match(/<form className="catalog-filter-form" id="catalog-field-filters" onSubmit=\{([^}]+)\}>/)?.[1]
    const handlerStart = app.indexOf('const handleApplyTextSearch =')
    const handlerEnd = app.indexOf('\n  const handleApplySearch', handlerStart)
    const handler = handlerStart >= 0 && handlerEnd > handlerStart ? app.slice(handlerStart, handlerEnd) : ''
    expect(headerSearchSubmit).toBe('handleApplyTextSearch')
    expect(filterSearchSubmit).toBe('handleApplySearch')
    expect(handler).toContain('setSearchTerm(searchDraft)')
    expect(handler).not.toContain('setFilters(')
  })

  test('shows the localized search hint and associates it with the header input', () => {
    const searchInputStart = app.indexOf('<input id="catalog-search-input"')
    const searchInputEnd = app.indexOf('\n', searchInputStart)
    const searchInput = searchInputStart >= 0 && searchInputEnd > searchInputStart ? app.slice(searchInputStart, searchInputEnd) : ''
    const visibleSearchHint = app.match(/<p className="catalog-search-hint"[^>]*>[^<]+<\/p>/)?.[0] ?? ''
    expect(searchInput).toContain('aria-describedby="catalog-search-hint"')
    expect(visibleSearchHint).toContain("t('catalog.searchHint')")
    expect(app.includes('className="sr-only" id="catalog-search-hint"')).toBe(false)
  })

  test('keeps header search in the catalog list while its visible hint is available', () => {
    expect(app).toContain("activeWorkspaceView === 'catalog' && !selectedRecord && !recordDetailBusy && !recordDetailError && (")
  })

  test('hides the closed mobile drawer from keyboard navigation and restores focus on close', () => {
    expect(appStyles).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*?\.vault-sidebar\s*\{[^}]*display:\s*none/)
    expect(appStyles).toMatch(/\.vault-mobile-nav-open\s+\.vault-sidebar\s*\{[^}]*display:\s*flex/)
    expect(app).toContain('mobileNavToggleRef.current?.focus()')
  })

  test('moves keyboard focus into the mobile drawer when opened', () => {
    expect(app).toContain("document.getElementById('vault-sidebar-navigation')?.querySelector('button')?.focus()")
  })

  test('keeps the mobile backdrop out of the tab sequence and closes the drawer on Escape', () => {
    const backdrop = app.match(/<button className="vault-nav-backdrop"[^>]*>/)?.[0] ?? ''
    const escapeHandler = app.match(/onKeyDown=\{\(event\) => \{\s*if \(event.key === 'Escape' && mobileNavOpen\) \{\s*event.preventDefault\(\)\s*closeMobileNavigation\(\)\s*\}\s*\}\}/)?.[0] ?? ''
    expect(backdrop).toContain('tabIndex={-1}')
    expect(escapeHandler).toContain('closeMobileNavigation()')
  })

  test('closes transient mobile navigation when logout succeeds', () => {
    expect(app).toMatch(/setActiveWorkspaceView\('catalog'\)\s*setMobileNavOpen\(false\)\s*setIdentity\(null\)/)
  })

  test('centers the search action within the header field', () => {
    expect(appStyles).toMatch(/\.vault-search-submit\s*\{[^}]*top:\s*50%[^}]*transform:\s*translateY\(-50%\)/)
  })

  test('preserves the supported record, audit, and Excel workflows', () => {
    expect(app).toContain('<CatalogRecordGallery')
    expect(app).not.toContain('<CatalogRecordTable')
    expect(app).toContain('<CatalogRecordDetail')
    expect(app).toContain('<RecordAuditHistory')
    expect(app).toContain('<ImportColumnMappingView')
    expect(app).toContain('<ImportHistoryView')
    expect(app).toContain("fetch(`/api/v1/records${query}`")
  })

  test('styles collapsible navigation responsively and retains semantic theme tokens', () => {
    expect(appStyles).toMatch(/\.vault-sidebar\s*\{[^}]*position:\s*fixed/)
    expect(appStyles).toMatch(/\.vault-sidebar-collapsed\s+\.vault-sidebar\s*\{[^}]*width:/)
    expect(appStyles).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*?\.vault-sidebar\s*\{[^}]*display:\s*none/)
    expect(styles).toMatch(/--color-canvas:/)
    expect(styles).toMatch(/--color-accent:/)
    expect(styles).toMatch(/prefers-reduced-motion/)
  })
})
