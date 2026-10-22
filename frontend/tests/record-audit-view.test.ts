import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'bun:test'
import { RecordAuditHistory } from '../src/record-audit-view'
import type { ProductRecordAuditEvent } from '../src/record-audit'

const event: ProductRecordAuditEvent = {
  eventId: 'event-1',
  actorId: 'actor-1',
  occurredAt: '2026-10-22T08:00:00Z',
  action: 'records.created',
  target: 'product-record:record-1',
  outcome: 'succeeded',
  correlationId: 'trace-1',
  metadata: { recordId: 'record-1' },
}

const onClose = () => undefined

describe('RecordAuditHistory', () => {
  test('renders a loading status and accessible close control', () => {
    const markup = renderToStaticMarkup(createElement(RecordAuditHistory, {
      recordLabel: 'PR-001', events: [], loading: true, error: '', onClose,
    }))

    expect(markup).toContain('Lịch sử kiểm toán — PR-001')
    expect(markup).toContain('role="status"')
    expect(markup).toContain('Đang tải lịch sử kiểm toán')
    expect(markup).toContain('aria-label="Đóng lịch sử kiểm toán"')
  })

  test('renders an empty state and a permission error clearly', () => {
    const emptyMarkup = renderToStaticMarkup(createElement(RecordAuditHistory, {
      recordLabel: 'PR-001', events: [], loading: false, error: '', onClose,
    }))
    const errorMarkup = renderToStaticMarkup(createElement(RecordAuditHistory, {
      recordLabel: 'PR-001', events: [], loading: false,
      error: 'Không có quyền xem lịch sử kiểm toán (audit.read).', onClose,
    }))

    expect(emptyMarkup).toContain('Chưa có sự kiện kiểm toán cho hồ sơ này.')
    expect(errorMarkup).toContain('role="alert"')
    expect(errorMarkup).toContain('audit.read')
  })

  test('renders event fields and escapes metadata as text', () => {
    const markup = renderToStaticMarkup(createElement(RecordAuditHistory, {
      recordLabel: 'PR-001',
      events: [{ ...event, metadata: { note: '<img src=x onerror=alert(1)>' } }],
      loading: false,
      error: '',
      onClose,
    }))

    expect(markup).toContain('Tạo hồ sơ')
    expect(markup).toContain('Thành công')
    expect(markup).toContain('actor-1')
    expect(markup).toContain('trace-1')
    expect(markup).toContain('product-record:record-1')
    expect(markup).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(markup).not.toContain('<img src=x')
  })

  test('keeps unknown action and outcome values readable', () => {
    const markup = renderToStaticMarkup(createElement(RecordAuditHistory, {
      recordLabel: 'PR-001',
      events: [{ ...event, action: 'custom.action', outcome: 'pending-review' }],
      loading: false,
      error: '',
      onClose,
    }))

    expect(markup).toContain('custom.action')
    expect(markup).toContain('pending-review')
  })
})
