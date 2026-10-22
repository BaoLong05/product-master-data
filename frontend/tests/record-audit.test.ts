import { describe, expect, test } from 'bun:test'
import { loadRecordAudit } from '../src/record-audit'
import { translate, type MessageKey, type MessageValues } from '../src/i18n'

const event = {
  eventId: 'event-1',
  actorId: 'actor-1',
  occurredAt: '2026-10-22T08:00:00Z',
  action: 'records.created',
  target: 'product-record:record-1',
  outcome: 'succeeded',
  correlationId: 'trace-1',
  metadata: { recordId: 'record-1' },
}

describe('loadRecordAudit', () => {
  test('requests the selected record history with same-origin credentials and returns events unchanged', async () => {
    let requestedUrl = ''
    let requestInit: RequestInit | undefined
    const fetcher: typeof fetch = async (input, init) => {
      requestedUrl = String(input)
      requestInit = init
      return Response.json([event])
    }

    const result = await loadRecordAudit('record-1', fetcher)

    expect(requestedUrl).toBe('/api/v1/records/record-1/audit')
    expect(requestInit?.credentials).toBe('same-origin')
    expect(result).toEqual([event])
  })

  test('reports the separate audit.read permission when access is denied', async () => {
    const fetcher: typeof fetch = async () => new Response(null, { status: 403 })

    await expect(loadRecordAudit('record-1', fetcher)).rejects.toThrow('audit.read')
  })

  test('localizes safe permission fallbacks using the active UI language', async () => {
    const fetcher: typeof fetch = async () => new Response(null, { status: 403 })
    const english = (key: MessageKey, values?: MessageValues) => translate('en', key, values)

    await expect(loadRecordAudit('record-1', fetcher, english)).rejects.toThrow('Your account does not have the audit.read permission.')
  })

  test('uses a safe status message when another error response has no message', async () => {
    const fetcher: typeof fetch = async () => new Response(null, { status: 404 })

    await expect(loadRecordAudit('record-1', fetcher)).rejects.toThrow('Không tìm thấy dữ liệu được yêu cầu.')
  })

  test('localizes a backend error code without exposing its English message', async () => {
    const fetcher: typeof fetch = async () => Response.json({
      code: 'invalid_query_parameter',
      message: 'Unsupported search field.',
    }, { status: 400 })
    const english = (key: MessageKey, values?: MessageValues) => translate('en', key, values)

    await expect(loadRecordAudit('record-1', fetcher, english))
      .rejects.toThrow('A search or filter field is unsupported. Clear the filters and try again.')
  })
})
