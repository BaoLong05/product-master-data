import { translate, type Translate } from './i18n'
import { localizeApiError } from './api-errors'

export type ProductRecordAuditEvent = {
  eventId: string
  actorId: string | null
  occurredAt: string
  action: string
  target: string
  outcome: string
  correlationId: string
  metadata: Record<string, unknown>
}

export async function loadRecordAudit(
  recordId: string,
  fetcher: typeof fetch = fetch,
  t: Translate = (key, values) => translate('vi', key, values),
): Promise<ProductRecordAuditEvent[]> {
  const response = await fetcher(`/api/v1/records/${encodeURIComponent(recordId)}/audit`, {
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(await localizeApiError(response, t, { forbiddenMessage: 'audit.noPermission' }))
  }

  const body: unknown = await response.json()
  if (!Array.isArray(body)) throw new Error(t('audit.invalidResponse'))
  return body as ProductRecordAuditEvent[]
}
