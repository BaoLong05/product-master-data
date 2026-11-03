import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')

describe('local HTTPS API proxy', () => {
  test('uses the HTTPS API endpoint so secure antiforgery cookies work in the browser', () => {
    expect(viteConfig).toContain("target: process.env.VITE_API_TARGET ?? 'https://localhost:7168'")
    expect(viteConfig).toMatch(/secure:\s*false/)
  })
})
