import { describe, expect, test } from 'bun:test'
import {
  createImportCommitRequest,
  createImportHistoryRequest,
  importHistoryItemUrl,
  importHistoryUrl,
} from '../src/import-commit'

describe('Excel import requests', () => {
  test('posts the selected workbook, worksheet, explicit mapping, and antiforgery token', async () => {
    const file = new File(['xlsx-bytes'], 'source.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const request = createImportCommitRequest(file, 'csrf-token', 'Sheet 1', { 2: 'itemName', 1: 'mCode' })
    const body = request.body as FormData

    expect(request.method).toBe('POST')
    expect(request.credentials).toBe('same-origin')
    expect(request.headers).toEqual({ 'X-CSRF-TOKEN': 'csrf-token' })
    const uploadedFile = body.get('file') as File
    expect(uploadedFile.name).toBe('source.xlsx')
    expect(uploadedFile.type).toBe(file.type)
    expect(await uploadedFile.text()).toBe('xlsx-bytes')
    expect(body.get('worksheetName')).toBe('Sheet 1')
    expect(body.get('columnMapping')).toBe('{"1":"mCode","2":"itemName"}')
  })

  test('reads a bounded import history and addresses a selected batch detail', () => {
    expect(importHistoryUrl()).toBe('/api/v1/imports/history?take=20')
    expect(importHistoryUrl(100)).toBe('/api/v1/imports/history?take=100')
    expect(importHistoryItemUrl('batch-id')).toBe('/api/v1/imports/history/batch-id')
    expect(createImportHistoryRequest()).toEqual({ method: 'GET', credentials: 'same-origin' })
  })
})
