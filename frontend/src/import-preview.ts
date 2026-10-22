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
