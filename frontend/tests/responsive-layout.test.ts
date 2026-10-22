import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const appStyles = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
const globalStyles = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const styles = `${globalStyles}\n${appStyles}`

describe('responsive layout acceptance', () => {
  test('reflows the shared header and its controls on tablet and phone widths', () => {
    expect(styles).toMatch(/@media\s*\(max-width:\s*900px\)[\s\S]*?\.topbar\s*\{[^}]*flex-wrap:\s*wrap/)
    expect(styles).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*?\.topbar\s*\{[^}]*flex-wrap:\s*wrap/)
    expect(styles).toMatch(/@media\s*\(max-width:\s*500px\)[\s\S]*?\.topbar-actions\s*\{[^}]*flex-wrap:\s*wrap/)
    expect(styles).toMatch(/\.topbar-actions\s*\{[^}]*min-width:\s*0/)
  })

  test('stacks pagination and keeps the table scroll bounded on narrow phones', () => {
    expect(styles).toMatch(/@media\s*\(max-width:\s*500px\)[\s\S]*?\.pagination\s*\{[^}]*flex-direction:\s*column/)
    expect(styles).toContain('.table-scroll { width: 100%; min-width: 0; overflow-x: auto;')
  })

  test('keeps app content shrinkable and caps wide desktop content', () => {
    expect(styles).toMatch(/\.workspace\s*\{[^}]*min-width:\s*0/)
    expect(styles).toMatch(/@media\s*\(min-width:\s*1600px\)[\s\S]*?\.workspace\s*\{[^}]*1380px/)
    expect(globalStyles).toContain('min-width: 320px;')
  })
})
