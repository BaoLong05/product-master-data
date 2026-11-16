import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

describe('root development commands', () => {
  test('dev starts the combined API and web development runner', () => {
    expect(packageJson.scripts.dev).toBe('bun run scripts/dev.ts')
  })

  test('data starts PostgreSQL and applies database migrations', () => {
    expect(packageJson.scripts.data).toBe('bun run scripts/data.ts')
  })
})
