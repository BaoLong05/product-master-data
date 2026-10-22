import { getBackendErrorMessageKey, type MessageKey, type Translate } from './i18n'

export type ApiErrorOptions = {
  forbiddenMessage?: MessageKey
}

export async function localizeApiError(
  response: Response,
  t: Translate,
  options: ApiErrorOptions = {},
): Promise<string> {
  let code: unknown
  try {
    const body: unknown = await response.clone().json()
    if (typeof body === 'object' && body !== null && 'code' in body) code = body.code
  } catch {
    // Empty and non-JSON error bodies use the localized status fallback.
  }

  const messageKey = getBackendErrorMessageKey(code)
  if (messageKey) return t(messageKey)

  switch (response.status) {
    case 400: return t('error.badRequest')
    case 401: return t('error.unauthorized')
    case 403: return t(options.forbiddenMessage ?? 'error.forbidden')
    case 404: return t('error.notFound')
    case 409: return t('error.conflict')
    case 429: return t('error.rateLimited')
    default: return t('error.httpStatus', { status: response.status })
  }
}
