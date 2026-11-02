export function createImportPreviewRequest(file: File, csrfToken: string, worksheetName?: string): RequestInit {
  const form = new FormData()
  form.set('file', file)
  if (worksheetName !== undefined) form.set('worksheetName', worksheetName)

  return {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRF-TOKEN': csrfToken },
    body: form,
  }
}

export function createImportValidationRequest(
  file: File,
  csrfToken: string,
  worksheetName: string,
  mCodeColumnNumber: number,
): RequestInit {
  const form = new FormData()
  form.set('file', file)
  form.set('worksheetName', worksheetName)
  form.set('mCodeColumnNumber', String(mCodeColumnNumber))

  return {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRF-TOKEN': csrfToken },
    body: form,
  }
}
