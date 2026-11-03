import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'bun:test'

const directory = dirname(fileURLToPath(import.meta.url))
const appSource = readFileSync(resolve(directory, '../src/App.tsx'), 'utf8')

describe('Excel import workflow integration', () => {
  test('connects explicit confirmation to commit, results, and refreshed history', () => {
    expect(appSource).toContain('createImportCommitRequest')
    expect(appSource).toContain("fetch('/api/v1/imports/commit'")
    expect(appSource).toContain('window.confirm')
    expect(appSource).toContain('ImportCommitSummary')
    expect(appSource).toContain('ImportHistoryView')
    expect(appSource).toContain('await loadImportHistory()')
    expect(appSource).toContain('setListVersion')
  })
})
