import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'bun:test'

const directory = dirname(fileURLToPath(import.meta.url))
const appSource = readFileSync(resolve(directory, '../src/App.tsx'), 'utf8')

describe('Excel import session privacy', () => {
  test('clears workbook contents and import results when logout succeeds', () => {
    const logoutHandler = appSource.match(/const handleLogout = async \(\) => \{([\s\S]*?)\n  \}/)?.[1]
    expect(logoutHandler).toBeDefined()
    expect(logoutHandler).toContain('setImportFile(null)')
    expect(logoutHandler).toContain('setImportPreview(null)')
    expect(logoutHandler).toContain('setRowPreview(null)')
    expect(logoutHandler).toContain('setImportColumnMapping({})')
    expect(logoutHandler).toContain('setImportValidation(null)')
    expect(logoutHandler).toContain('setImportCommitResult(null)')
    expect(logoutHandler).toContain('setSelectedImportBatch(null)')
  })
})