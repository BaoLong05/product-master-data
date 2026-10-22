import type { ReactNode } from 'react'
import type { ProductRecordAuditEvent } from './record-audit'
import { useAppPreferences } from './use-app-preferences'
import { formatLocaleDateTime, type MessageKey } from './i18n'

const actionLabels: Record<string, MessageKey> = {
  'records.created': 'audit.actionCreated',
  'records.updated': 'audit.actionUpdated',
  'records.deleted': 'audit.actionDeleted',
}

const outcomeLabels: Record<string, MessageKey> = {
  succeeded: 'audit.succeeded',
  failed: 'audit.failed',
}

export function RecordAuditHistory({ recordLabel, events, loading, error, onClose }: {
  recordLabel: string
  events: readonly ProductRecordAuditEvent[]
  loading: boolean
  error: string
  onClose: () => void
}): ReactNode {
  const { locale, t } = useAppPreferences()
  return (
    <section className="record-audit-panel" id="record-audit-panel" aria-labelledby="record-audit-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('audit.eyebrow')}</p>
          <h3 id="record-audit-title">{t('audit.title', { record: recordLabel })}</h3>
        </div>
        <button className="button button-quiet" type="button" aria-label={t('audit.close')} onClick={onClose}>{t('form.close')}</button>
      </div>
      <p className="audit-permission-hint">{t('audit.permission')}</p>
      {loading ? (
        <p className="audit-loading" role="status">{t('audit.loading')}</p>
      ) : error ? (
        <p className="alert alert-error" role="alert">{error}</p>
      ) : events.length === 0 ? (
        <p className="audit-empty" role="status">{t('audit.empty')}</p>
      ) : (
        <ol className="record-audit-list">
          {events.map((event) => (
            <li className="record-audit-event" key={event.eventId}>
              <div className="record-audit-event-heading">
                <strong>{actionLabels[event.action] ? t(actionLabels[event.action]) : event.action}</strong>
                <span className={event.outcome === 'succeeded' ? 'audit-outcome audit-outcome-success' : 'audit-outcome'}>
                  {outcomeLabels[event.outcome] ? t(outcomeLabels[event.outcome]) : event.outcome}
                </span>
              </div>
              <time className="audit-timestamp" dateTime={event.occurredAt}>{formatLocaleDateTime(locale, event.occurredAt)}</time>
              <dl className="audit-event-details">
                <div><dt>{t('audit.actor')}</dt><dd>{event.actorId ?? t('audit.system')}</dd></div>
                <div><dt>{t('audit.correlation')}</dt><dd>{event.correlationId}</dd></div>
                <div><dt>{t('audit.target')}</dt><dd>{event.target}</dd></div>
              </dl>
              <details className="audit-metadata">
                <summary>{t('audit.metadata')}</summary>
                <pre>{JSON.stringify(event.metadata, null, 2) ?? '{}'}</pre>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
