import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const appStyles = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
const globalStyles = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const styles = `${globalStyles}\n${appStyles}`

describe('responsive layout acceptance', () => {
  test('reflows the shared header and its controls on tablet and phone widths', () => {
    expect(styles).toMatch(/@media\s*\(max-width:\s*900px\)[\s\S]*?\.vault-topbar\s*\{[^}]*flex-wrap:\s*wrap/)
    expect(styles).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*?\.vault-topbar\s*\{[^}]*flex-wrap:\s*wrap/)
    expect(styles).toMatch(/@media\s*\(max-width:\s*500px\)[\s\S]*?\.vault-topbar-actions\s*\{[^}]*flex-wrap:\s*wrap/)
    expect(styles).toMatch(/\.vault-topbar-actions\s*\{[^}]*min-width:\s*0/)
  })

  test('stacks pagination and keeps the table scroll bounded on narrow phones', () => {
    expect(styles).toMatch(/@media\s*\(max-width:\s*500px\)[\s\S]*?\.pagination\s*\{[^}]*flex-direction:\s*column/)
    expect(styles).toContain('.table-scroll { width: 100%; min-width: 0; overflow-x: auto;')
  })

  test('uses a responsive library shell and photo-first item gallery', () => {
    expect(appStyles).toMatch(/\.vault-app-shell\s*\{[^}]*minmax\(0,\s*1fr\)/)
    expect(appStyles).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*?\.vault-app-shell\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(appStyles).toMatch(/\.catalog-gallery-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill/)
    expect(appStyles).toMatch(/\.catalog-gallery-image\s*\{[^}]*object-fit:\s*contain/)
    expect(appStyles).toMatch(/\.catalog-gallery-photo\s*\{[^}]*aspect-ratio:/)
    expect(appStyles).toMatch(/\.record-detail-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax/)
  })

  test('stacks the detail summary and actions on narrow phones', () => {
    expect(appStyles).toMatch(/@media\s*\(max-width:\s*500px\)[\s\S]*?\.catalog-record-detail-heading\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(appStyles).toMatch(/@media\s*\(max-width:\s*500px\)[\s\S]*?\.catalog-record-detail-actions\s*\{[^}]*flex-direction:\s*column/)
  })

  test('keeps app content shrinkable and caps wide desktop content', () => {
    expect(styles).toMatch(/\.workspace\s*\{[^}]*min-width:\s*0/)
    expect(styles).toMatch(/@media\s*\(min-width:\s*1600px\)[\s\S]*?\.workspace\s*\{[^}]*1380px/)
    expect(globalStyles).toContain('min-width: 320px;')
  })
})
