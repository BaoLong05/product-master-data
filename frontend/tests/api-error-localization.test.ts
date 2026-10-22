import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localizeApiError } from '../src/api-errors'
import { translate, type Locale } from '../src/i18n'

const backendCodes = {
  invalid_antiforgery_token: 'error.backend.invalidAntiforgeryToken',
  missing_workbook: 'error.backend.missingWorkbook',
  workbook_too_large: 'error.backend.workbookTooLarge',
  unsupported_workbook_type: 'error.backend.unsupportedWorkbookType',
  invalid_workbook: 'error.backend.invalidWorkbook',
  invalid_pagination: 'error.backend.invalidPagination',
  invalid_query_parameter: 'error.backend.invalidQueryParameter',
  invalid_query_value: 'error.backend.invalidQueryValue',
  record_version_conflict: 'error.backend.recordVersionConflict',
  duplicate_m_code: 'error.backend.duplicateMCode',
} as const

const locales: Locale[] = ['vi', 'en', 'ko']
const tFor = (locale: Locale) => (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate(locale, key, values)
const testDirectory = dirname(fileURLToPath(import.meta.url))

describe('backend API error localization', () => {
  test('keeps the translation map in parity with API error response codes in source', () => {
    const sourceFiles = [
      '../../src/ProductMasterData.Api/Catalog/ProductRecordEndpoints.cs',
      '../../src/ProductMasterData.Api/Imports/ImportPreviewEndpoints.cs',
    ]
    const sourceCodes = new Set(sourceFiles.flatMap((path) => {
      const source = readFileSync(resolve(testDirectory, path), 'utf8')
      return [...source.matchAll(/new ApiErrorResponse\("([^"]+)"/g)].map(([, code]) => code)
    }))

    expect([...sourceCodes].sort()).toEqual(Object.keys(backendCodes).sort())
  })

  test('translates each source-verified backend code in Vietnamese, English, and Korean', async () => {
    for (const [code, key] of Object.entries(backendCodes)) {
      const response = Response.json({ code, message: `raw server message for ${code}` }, { status: code === 'duplicate_m_code' || code === 'record_version_conflict' ? 409 : 400 })
      for (const locale of locales) {
        const message = await localizeApiError(response.clone(), tFor(locale))
        expect(message).toBe(translate(locale, key))
        expect(message).not.toContain('raw server message')
      }
    }
  })

  test('uses localized safe fallbacks for unknown codes and status-only responses', async () => {
    const unknown = Response.json({ code: 'future_unknown_code', message: 'raw server message' }, { status: 400 })
    const statusOnly = new Response(null, { status: 500 })
    for (const locale of locales) {
      expect(await localizeApiError(unknown.clone(), tFor(locale))).toBe(translate(locale, 'error.badRequest'))
      expect(await localizeApiError(statusOnly.clone(), tFor(locale))).toBe(translate(locale, 'error.httpStatus', { status: 500 }))
    }
  })

  test('maps status-only authentication, permission, missing, conflict, and rate-limit responses', async () => {
    const cases = [
      [401, 'error.unauthorized'],
      [403, 'error.forbidden'],
      [404, 'error.notFound'],
      [409, 'error.conflict'],
      [429, 'error.rateLimited'],
    ] as const
    for (const locale of locales) {
      for (const [status, key] of cases) {
        expect(await localizeApiError(new Response(null, { status }), tFor(locale))).toBe(translate(locale, key))
      }
      expect(await localizeApiError(new Response(null, { status: 403 }), tFor(locale), { forbiddenMessage: 'audit.noPermission' }))
        .toBe(translate(locale, 'audit.noPermission'))
    }
  })
})
