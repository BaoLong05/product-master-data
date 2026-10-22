import { describe, expect, test } from 'bun:test'
import { createImportPreviewRequest } from '../src/import-preview'

describe('createImportPreviewRequest', () => {
  test('sends the selected workbook as multipart form data with the CSRF header', () => {
    const file = new File(['workbook'], 'products.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const request = createImportPreviewRequest(file, 'csrf-request-token')
    const body = request.body as FormData

    expect(request.method).toBe('POST')
    expect(request.credentials).toBe('same-origin')
    expect(request.headers).toEqual({ 'X-CSRF-TOKEN': 'csrf-request-token' })
    const uploadedFile = body.get('file') as File
    expect(uploadedFile).toBeInstanceOf(File)
    expect(uploadedFile.name).toBe('products.xlsx')
    expect(uploadedFile.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  })

  test('includes the selected worksheet name in the multipart request', () => {
    const file = new File(['workbook'], 'products.xlsx')
    const request = createImportPreviewRequest(file, 'csrf-request-token', 'Inventory')
    const body = request.body as FormData

    expect(body.get('worksheetName')).toBe('Inventory')
    expect(request.headers).toEqual({ 'X-CSRF-TOKEN': 'csrf-request-token' })
  })
})
