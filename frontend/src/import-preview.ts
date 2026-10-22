export function createImportPreviewRequest(file: File, csrfToken: string): RequestInit {
  const form = new FormData()
  form.set('file', file)

  return {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRF-TOKEN': csrfToken },
    body: form,
  }
}
