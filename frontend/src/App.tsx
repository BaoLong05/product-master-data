import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { buildCatalogQuery } from './catalog-search'
import { ImportColumnMapping as ImportColumnMappingView } from './import-column-mapping-view'
import { updateImportColumnMapping, type ImportColumnMapping, type ImportPreviewRow } from './import-column-mapping'
import { ImportHeaderDiagnostics } from './import-header-diagnostics'
import { createImportPreviewRequest } from './import-preview'
import { loadRecordAudit, type ProductRecordAuditEvent } from './record-audit'
import { RecordAuditHistory } from './record-audit-view'
import { AppPreferencesProvider } from './app-preferences'
import { PreferenceControls } from './preference-controls'
import { useAppPreferences } from './use-app-preferences'
import { localizeApiError } from './api-errors'
import { formatLocaleDate, formatLocaleNumber, type MessageKey, type Translate } from './i18n'
import './App.css'

type CurrentIdentity = { userId: string | null; email: string | null }
type ProductRecordForm = {
  dateValue: string
  companyName: string
  itemName: string
  mCode: string
  itemCode: string
  productType: string
  productStatus: string
  approvalStatus: string
  sampleOrProductionOrder: string
  companyNameLetters: string
  oldRegion: string
  sampleSavedDate: string
  picImage: string
  purchaseOrder: string
  productionOrderPdf: string
  note: string
  printedAt: string
  discName: string
  soi: string
  maso: string
  denier: string
  price: string
  region: string
  quantity: string
  picUrl: string
  internalItem: string
  request: string
}
type ProductRecordListItem = {
  id: string
  mCode: string | null
  itemName: string | null
  companyName: string | null
  productStatus: string | null
  updatedAt: string
  version: number
}
type ProductRecordPage = {
  items: ProductRecordListItem[]
  page: number
  pageSize: number
  totalCount: number
}
type ProductRecordDetail = ProductRecordForm & { id: string; version: number }
type RecordAuditPanelState = {
  recordId: string
  recordLabel: string
  events: ProductRecordAuditEvent[]
  loading: boolean
  error: string
}
type ImportWorksheet = { name: string; headers: (string | null)[]; rows?: ImportPreviewRow[] }
type ImportPreview = { worksheets: ImportWorksheet[] }

const pageSize = 50
const formFields: { key: keyof ProductRecordForm; multiline?: boolean }[] = [
  { key: 'dateValue' },
  { key: 'companyName' },
  { key: 'itemName' },
  { key: 'mCode' },
  { key: 'itemCode' },
  { key: 'productType' },
  { key: 'productStatus' },
  { key: 'approvalStatus' },
  { key: 'sampleOrProductionOrder' },
  { key: 'companyNameLetters' },
  { key: 'oldRegion' },
  { key: 'sampleSavedDate' },
  { key: 'picImage' },
  { key: 'purchaseOrder' },
  { key: 'productionOrderPdf' },
  { key: 'note', multiline: true },
  { key: 'printedAt' },
  { key: 'discName' },
  { key: 'soi' },
  { key: 'maso' },
  { key: 'denier' },
  { key: 'price' },
  { key: 'region' },
  { key: 'quantity' },
  { key: 'picUrl' },
  { key: 'internalItem' },
  { key: 'request', multiline: true },
]

const emptyForm = (): ProductRecordForm => Object.fromEntries(
  formFields.map(({ key }) => [key, '']),
) as ProductRecordForm

const formFieldLabels: Record<keyof ProductRecordForm, MessageKey> = {
  dateValue: 'field.date', companyName: 'field.companyName', itemName: 'field.itemName', mCode: 'field.mCode',
  itemCode: 'field.itemCode', productType: 'field.productType', productStatus: 'field.productStatus',
  approvalStatus: 'field.approvalStatus', sampleOrProductionOrder: 'field.sampleOrProductionOrder',
  companyNameLetters: 'field.companyNameLetters', oldRegion: 'field.oldRegion', sampleSavedDate: 'field.sampleSavedDate',
  picImage: 'field.picImage', purchaseOrder: 'field.purchaseOrder', productionOrderPdf: 'field.productionOrderPdf',
  note: 'field.note', printedAt: 'field.printedAt', discName: 'field.discName', soi: 'field.soi', maso: 'field.maso',
  denier: 'field.denier', price: 'field.price', region: 'field.region', quantity: 'field.quantity', picUrl: 'field.picUrl',
  internalItem: 'field.internalItem', request: 'field.request',
}

async function requestAntiforgeryToken(t: Translate): Promise<string> {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin' })
  if (!response.ok) throw new Error(t('error.csrfInit'))
  const result = await response.json() as { requestToken?: string | null }
  if (!result.requestToken) throw new Error(t('error.csrfToken'))
  return result.requestToken
}

async function responseMessage(response: Response, t: Translate): Promise<string> {
  return localizeApiError(response, t)
}

function AppContent() {
  const { locale, t } = useAppPreferences()
  const localizedFormFields = formFields.map((field) => ({ ...field, label: t(formFieldLabels[field.key]) }))
  const [identity, setIdentity] = useState<CurrentIdentity | null>(null)
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [sessionError, setSessionError] = useState('')
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [recordPage, setRecordPage] = useState<ProductRecordPage | null>(null)
  const [page, setPage] = useState(1)
  const [listVersion, setListVersion] = useState(0)
  const [searchDraft, setSearchDraft] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersDraft, setFiltersDraft] = useState<ProductRecordForm>(emptyForm)
  const [filters, setFilters] = useState<ProductRecordForm>(emptyForm)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [listError, setListError] = useState('')
  const [listBusy, setListBusy] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<ProductRecordForm>(emptyForm)
  const [editingRecord, setEditingRecord] = useState<{ id: string; version: number } | null>(null)
  const [formError, setFormError] = useState('')
  const [saveBusy, setSaveBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [selectedWorksheetName, setSelectedWorksheetName] = useState('')
  const [rowPreview, setRowPreview] = useState<ImportWorksheet | null>(null)
  const [importColumnMapping, setImportColumnMapping] = useState<ImportColumnMapping>({})
  const [importError, setImportError] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [auditPanel, setAuditPanel] = useState<RecordAuditPanelState | null>(null)
  const auditRequestGeneration = useRef(0)

  useEffect(() => {
    let cancelled = false
    const loadIdentity = async () => {
      try {
        const response = await fetch('/api/v1/auth/me', { credentials: 'same-origin' })
        if (response.status === 401) return
        if (!response.ok) throw new Error(t('error.sessionUnavailable'))
        const currentIdentity = await response.json() as CurrentIdentity
        if (!cancelled) setIdentity(currentIdentity)
      } catch {
        if (!cancelled) setSessionError(t('error.connection'))
      }
    }
    void loadIdentity()
    return () => { cancelled = true }
  }, [t])

  useEffect(() => {
    if (!identity) return
    let cancelled = false
    const controller = new AbortController()
    const loadRecords = async () => {
      setListBusy(true)
      setListError('')
      try {
        const query = buildCatalogQuery(page, pageSize, searchTerm, filters)
        const response = await fetch(`/api/v1/records${query}`, {
          credentials: 'same-origin',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(await responseMessage(response, t))
        const result = await response.json() as ProductRecordPage
        if (!cancelled) setRecordPage(result)
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === 'AbortError')) {
          setListError(error instanceof Error ? error.message : t('error.catalogLoad'))
        }
      } finally {
        if (!cancelled) setListBusy(false)
      }
    }
    void loadRecords()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [identity, page, listVersion, searchTerm, filters, t])

  const handleApplySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    closeAuditPanel()
    setPage(1)
    setSearchTerm(searchDraft)
    setFilters(filtersDraft)
  }

  const handleClearSearch = () => {
    closeAuditPanel()
    setSearchDraft('')
    setSearchTerm('')
    setFiltersDraft(emptyForm())
    setFilters(emptyForm())
    setPage(1)
  }

  const requestImportPreview = async (worksheetName?: string) => {
    setImportError('')
    if (!importFile) {
      setImportError(t('error.importPick'))
      return
    }

    setImportBusy(true)
    try {
      const token = await requestAntiforgeryToken(t)
      const response = await fetch('/api/v1/imports/preview', createImportPreviewRequest(importFile, token, worksheetName))
      if (!response.ok) throw new Error(await responseMessage(response, t))
      const preview = await response.json() as ImportPreview
      if (worksheetName === undefined) {
        setImportPreview(preview)
        setSelectedWorksheetName(preview.worksheets[0]?.name ?? '')
        setRowPreview(null)
      } else {
        setRowPreview(preview.worksheets[0] ?? null)
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('error.importRead'))
    } finally {
      setImportBusy(false)
    }
  }

  const handlePreviewImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setImportPreview(null)
    setSelectedWorksheetName('')
    setRowPreview(null)
    setImportColumnMapping({})
    await requestImportPreview()
  }

  const handlePreviewRows = async () => {
    if (!selectedWorksheetName) {
      setImportError(t('error.worksheetRequired'))
      return
    }
    setRowPreview(null)
    await requestImportPreview(selectedWorksheetName)
  }

  const closeAuditPanel = () => {
    auditRequestGeneration.current += 1
    setAuditPanel(null)
  }

  const handleToggleAudit = async (record: ProductRecordListItem) => {
    if (auditPanel?.recordId === record.id) {
      closeAuditPanel()
      return
    }

    const requestGeneration = ++auditRequestGeneration.current
    const recordLabel = record.mCode || record.itemName || record.id
    setAuditPanel({ recordId: record.id, recordLabel, events: [], loading: true, error: '' })
    try {
      const events = await loadRecordAudit(record.id, fetch, t)
      if (requestGeneration !== auditRequestGeneration.current) return
      setAuditPanel((current) => current?.recordId === record.id ? { ...current, events, loading: false } : current)
    } catch (error) {
      if (requestGeneration !== auditRequestGeneration.current) return
      setAuditPanel((current) => current?.recordId === record.id
        ? { ...current, loading: false, error: error instanceof Error ? error.message : t('error.auditLoad') }
        : current)
    }
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    setLoginBusy(true)
    try {
      const requestToken = await requestAntiforgeryToken(t)
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': requestToken },
        body: JSON.stringify({ userName, password }),
      })
      if (!response.ok) {
        setLoginError(t('error.loginFailed'))
        return
      }
      const identityResponse = await fetch('/api/v1/auth/me', { credentials: 'same-origin' })
      if (!identityResponse.ok) throw new Error(t('error.loginSession'))
      setIdentity(await identityResponse.json() as CurrentIdentity)
      setPassword('')
      setSessionError('')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : t('error.loginUnavailable'))
    } finally {
      setLoginBusy(false)
    }
  }

  const handleLogout = async () => {
    setLogoutBusy(true)
    setNotice('')
    try {
      const requestToken = await requestAntiforgeryToken(t)
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': requestToken },
      })
      if (!response.ok) throw new Error(await responseMessage(response, t))
      setIdentity(null)
      setRecordPage(null)
      setFormOpen(false)
      setEditingRecord(null)
      setForm(emptyForm())
      handleClearSearch()
      setFiltersOpen(false)
      setSessionError('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('error.logoutUnavailable'))
    } finally {
      setLogoutBusy(false)
    }
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSaveBusy(true)
    try {
      const requestToken = await requestAntiforgeryToken(t)
      const response = await fetch(editingRecord ? `/api/v1/records/${editingRecord.id}` : '/api/v1/records', {
        method: editingRecord ? 'PUT' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': requestToken },
        body: JSON.stringify(editingRecord ? { ...form, version: editingRecord.version } : form),
      })
      if (!response.ok) throw new Error(await responseMessage(response, t))
      setForm(emptyForm())
      setEditingRecord(null)
      setFormOpen(false)
      closeAuditPanel()
      setPage(1)
      setListVersion((version) => version + 1)
      setNotice(t('notice.saved'))
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('error.saveFailed'))
    } finally {
      setSaveBusy(false)
    }
  }

  const handleEdit = async (id: string) => {
    setFormError('')
    setNotice('')
    try {
      const response = await fetch(`/api/v1/records/${id}`, { credentials: 'same-origin' })
      if (!response.ok) throw new Error(await responseMessage(response, t))
      const record = await response.json() as ProductRecordDetail
      const values = Object.fromEntries(formFields.map(({ key }) => [key, record[key] ?? ''])) as ProductRecordForm
      setForm(values)
      setEditingRecord({ id: record.id, version: record.version })
      setFormOpen(true)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('error.editLoad'))
    }
  }

  const handleDelete = async (record: ProductRecordListItem) => {
    if (!window.confirm(t('error.deleteConfirm', { record: record.mCode || record.itemName || record.id }))) return
    setNotice('')
    try {
      const requestToken = await requestAntiforgeryToken(t)
      const response = await fetch(`/api/v1/records/${record.id}?version=${record.version}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': requestToken },
      })
      if (!response.ok) throw new Error(await responseMessage(response, t))
      if (auditPanel?.recordId === record.id) closeAuditPanel()
      setListVersion((version) => version + 1)
      setNotice(t('error.deleteSuccess'))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('error.deleteFailed'))
    }
  }

  if (!identity) {
    return (
      <main className="login-page">
        <div className="login-page-toolbar"><PreferenceControls /></div>
        <div className="login-layout">
          <section className="login-story" aria-labelledby="login-story-title">
            <div className="login-story-brand">
              <span className="login-story-mark" aria-hidden="true">PM</span>
              <span className="login-story-wordmark"><strong>Product Master Data</strong><small>{t('brand.workspace')}</small></span>
            </div>
            <div className="login-story-copy">
              <p className="eyebrow">{t('login.storyEyebrow')}</p>
              <h1 id="login-story-title">{t('login.storyTitle')}</h1>
              <p className="login-story-description">{t('login.storyDescription')}</p>
            </div>
            <div className="login-visual" aria-hidden="true">
              <svg viewBox="0 0 560 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect className="login-visual-frame" x="22" y="18" width="384" height="184" rx="16" />
                <rect className="login-visual-topbar" x="42" y="38" width="344" height="34" rx="8" />
                <circle className="login-visual-accent" cx="60" cy="55" r="5" />
                <path className="login-visual-line" d="M78 55h92M184 55h44M258 55h72" />
                <rect className="login-visual-cell" x="42" y="88" width="96" height="28" rx="6" />
                <rect className="login-visual-cell" x="148" y="88" width="112" height="28" rx="6" />
                <rect className="login-visual-cell" x="270" y="88" width="116" height="28" rx="6" />
                <rect className="login-visual-cell" x="42" y="126" width="96" height="28" rx="6" />
                <rect className="login-visual-cell" x="148" y="126" width="112" height="28" rx="6" />
                <rect className="login-visual-cell" x="270" y="126" width="116" height="28" rx="6" />
                <path className="login-visual-line" d="M56 102h46M163 102h54M286 102h73M56 140h52M163 140h70M286 140h61" />
                <rect className="login-visual-float" x="326" y="98" width="208" height="104" rx="14" />
                <circle className="login-visual-accent" cx="350" cy="122" r="6" />
                <path className="login-visual-line" d="M366 122h86M348 150h164M348 168h124M348 186h146" />
              </svg>
            </div>
            <p className="login-story-meta"><strong>{t('login.sourceFields')}</strong><span aria-hidden="true">·</span><span>{t('login.catalogManaged')}</span></p>
          </section>

          <section className="login-card" aria-labelledby="login-title">
            <div className="login-card-heading">
              <p className="eyebrow">{t('login.internal')}</p>
              <h2 id="login-title">{t('login.title')}</h2>
              <p className="login-card-copy">{t('login.copy')}</p>
            </div>
            {(loginError || sessionError) && <p className="alert alert-error" role="alert">{loginError || sessionError}</p>}
            <form className="login-form" onSubmit={handleLogin}>
              <div className="login-field">
                <label htmlFor="userName">{t('login.username')}</label>
                <input id="userName" autoComplete="username" value={userName} onChange={(event) => setUserName(event.target.value)} required />
              </div>
              <div className="login-field">
                <label htmlFor="password">{t('login.password')}</label>
                <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              <button className="button button-primary login-submit" type="submit" disabled={loginBusy}>
                {loginBusy ? t('login.busy') : t('login.submit')}
              </button>
            </form>
            <p className="login-footnote">{t('login.footnote')}</p>
          </section>
        </div>
      </main>
    )
  }

  const totalPages = Math.max(1, Math.ceil((recordPage?.totalCount ?? 0) / pageSize))
  const activeFilterCount = formFields.filter(({ key }) => filters[key].trim()).length
  const hasActiveSearch = Boolean(searchTerm.trim() || activeFilterCount)

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#catalog" aria-label={t('brand.catalogLabel')}>
          <span className="brand-mark" aria-hidden="true">PM</span>
          <span><strong>Product Master Data</strong><small>{t('brand.workspace')}</small></span>
        </a>
        <div className="topbar-actions">
          <PreferenceControls />
          <span className="user-email">{identity.email ?? identity.userId}</span>
          <button className="button button-quiet" type="button" onClick={handleLogout} disabled={logoutBusy}>
            {logoutBusy ? t('app.logoutBusy') : t('app.logout')}
          </button>
        </div>
      </header>

      <main className="workspace" id="catalog">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{t('app.catalogEyebrow')}</p>
            <h1>{t('app.title')}</h1>
            <p className="page-subtitle">{t('app.subtitle')}</p>
          </div>
          <button className="button button-primary" type="button" onClick={() => { setFormError(''); setEditingRecord(null); setForm(emptyForm()); setFormOpen((open) => !open) }}>
            <span aria-hidden="true">＋</span> {t('app.createRecord')}
          </button>
        </div>

        {notice && <p className="alert alert-success" role="status">{notice}</p>}

        {formOpen && (
          <section className="form-card" aria-labelledby="form-title">
            <div className="section-heading">
              <div><p className="eyebrow">{editingRecord ? t('form.editEyebrow') : t('form.newEyebrow')}</p><h2 id="form-title">{t('form.title')}</h2></div>
              <button className="button button-quiet" type="button" onClick={() => { setFormOpen(false); setEditingRecord(null) }}>{t('form.close')}</button>
            </div>
            <p className="form-hint">{t('form.hint')}</p>
            {formError && <p className="alert alert-error" role="alert">{formError}</p>}
            <form onSubmit={handleSave}>
              <div className="form-grid">
                {localizedFormFields.map(({ key, label, multiline }) => (
                  <div className={`field${multiline ? ' field-wide' : ''}`} key={key}>
                    <label htmlFor={`record-${key}`}>{label}</label>
                    {multiline ? (
                      <textarea id={`record-${key}`} rows={3} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                    ) : (
                      <input id={`record-${key}`} type="text" value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
              <div className="form-actions">
                <button className="button button-quiet" type="button" onClick={() => { setFormOpen(false); setEditingRecord(null) }}>{t('form.cancel')}</button>
                <button className="button button-primary" type="submit" disabled={saveBusy}>{saveBusy ? t('form.saving') : editingRecord ? t('form.saveChanges') : t('form.save')}</button>
              </div>
            </form>
          </section>
        )}

        <section className="form-card import-preview-card" aria-labelledby="import-preview-title">
          <div className="section-heading">
            <div><p className="eyebrow">{t('import.eyebrow')}</p><h2 id="import-preview-title">{t('import.title')}</h2></div>
          </div>
          <p className="form-hint">{t('import.hint')}</p>
          {importError && <p className="alert alert-error" role="alert">{importError}</p>}
          <form className="import-preview-form" onSubmit={(event) => void handlePreviewImport(event)}>
            <label className="sr-only" htmlFor="import-workbook">{t('import.selectFile')}</label>
            <input
              id="import-workbook"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={importBusy}
              onChange={(event) => { setImportFile(event.target.files?.[0] ?? null); setImportPreview(null); setSelectedWorksheetName(''); setRowPreview(null); setImportColumnMapping({}); setImportError('') }}
            />
            <button className="button button-secondary" type="submit" disabled={importBusy || !importFile}>
              {importBusy ? t('import.checking') : t('import.showSheets')}
            </button>
          </form>
          {importPreview && (
            <>
              {importPreview.worksheets.length > 0 && (
                <div className="import-sheet-controls">
                  <div className="import-sheet-select">
                    <label htmlFor="import-worksheet">{t('import.worksheet')}</label>
                    <select
                      id="import-worksheet"
                      value={selectedWorksheetName}
                      disabled={importBusy}
                      onChange={(event) => { setSelectedWorksheetName(event.target.value); setRowPreview(null); setImportColumnMapping({}); setImportError('') }}
                    >
                      {importPreview.worksheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}
                    </select>
                  </div>
                  <button className="button button-secondary" type="button" disabled={importBusy || !selectedWorksheetName} onClick={() => void handlePreviewRows()}>
                    {importBusy ? t('import.reading') : t('import.firstRows')}
                  </button>
                </div>
              )}
              <div className="import-worksheets">
                {importPreview.worksheets.filter((sheet) => sheet.name === selectedWorksheetName).map((sheet) => (
                  <section className="import-worksheet" key={sheet.name}>
                    <h3>{sheet.name}</h3>
                    {sheet.headers.length ? (
                      <>
                        <ImportHeaderDiagnostics headers={sheet.headers} />
                        <ImportColumnMappingView
                          headers={sheet.headers}
                          fields={localizedFormFields}
                          mapping={importColumnMapping}
                          rows={rowPreview?.name === sheet.name ? rowPreview.rows : undefined}
                          onChange={(columnNumber, targetKey) => setImportColumnMapping((current) => updateImportColumnMapping(current, columnNumber, targetKey, localizedFormFields))}
                        />
                      </>
                    ) : <p>{t('import.noHeaders')}</p>}
                  </section>
                ))}
              </div>
              {rowPreview && (
                <section className="import-row-preview" aria-live="polite" aria-labelledby="import-row-preview-title">
                  <h3 id="import-row-preview-title">{t('import.rowPreviewTitle', { sheet: rowPreview.name })}</h3>
                  {rowPreview.rows?.length ? (
                    <>
                      <div className="import-row-table-scroll">
                        <table className="import-row-table">
                          <caption className="sr-only">{t('import.rawRowsCaption')}</caption>
                          <thead><tr><th scope="col">{t('import.excelRow')}</th>{rowPreview.headers.map((header, index) => <th scope="col" key={index}>{header || t('import.columnFallback', { number: index + 1 })}</th>)}</tr></thead>
                          <tbody>
                            {rowPreview.rows.map((row) => (
                              <tr key={row.rowNumber}>
                                <th scope="row">{row.rowNumber}</th>
                                {row.values.map((value, index) => <td key={index}>{row.formulaColumns.includes(index + 1) ? t('import.formulaHidden') : value ?? ''}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="import-preview-note">{t('import.formulaNote')}</p>
                    </>
                  ) : <p>{t('import.noRowsAfterHeader')}</p>}
                </section>
              )}
            </>
          )}
        </section>

        <section className="catalog-card" aria-labelledby="records-title">
          <div className="catalog-toolbar">
            <div><h2 id="records-title">{t('catalog.title')}</h2><p>{recordPage ? t('catalog.totalCount', { count: formatLocaleNumber(locale, recordPage.totalCount) }) : t('catalog.loading')}</p></div>
            <span className="page-indicator">{t('catalog.page', { page: formatLocaleNumber(locale, page), total: formatLocaleNumber(locale, totalPages) })}</span>
          </div>
          {listError && <p className="alert alert-error" role="alert">{listError}</p>}
          <form className="catalog-search" onSubmit={handleApplySearch}>
            <div className="search-row">
              <label className="sr-only" htmlFor="catalog-search-input">{t('catalog.searchLabel')}</label>
              <input
                id="catalog-search-input"
                type="search"
                placeholder={t('catalog.searchPlaceholder')}
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
              <button
                className="button button-quiet"
                type="button"
                aria-expanded={filtersOpen}
                aria-controls={filtersOpen ? 'catalog-field-filters' : undefined}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                {t('catalog.filter')}{activeFilterCount ? ` (${formatLocaleNumber(locale, activeFilterCount)})` : ''}
              </button>
              <button className="button button-primary" type="submit">{t('catalog.search')}</button>
            </div>
            <p className="search-hint">{t('catalog.searchHint')}</p>
            {filtersOpen && (
              <div className="field-filters" id="catalog-field-filters">
                {localizedFormFields.map(({ key, label }) => (
                  <div className="filter-field" key={key}>
                    <label htmlFor={`filter-${key}`}>{label}</label>
                    <input
                      id={`filter-${key}`}
                      type="search"
                      value={filtersDraft[key]}
                      onChange={(event) => setFiltersDraft((current) => ({ ...current, [key]: event.target.value }))}
                    />
                  </div>
                ))}
                <div className="filter-actions">
                  <button className="button button-quiet" type="button" onClick={handleClearSearch}>{t('catalog.clearFilters')}</button>
                  <button className="button button-primary" type="submit">{t('catalog.applyFilters')}</button>
                </div>
              </div>
            )}
          </form>
          <div className="table-scroll" aria-busy={listBusy}>
            <table>
              <caption className="sr-only">{t('catalog.tableCaption')}</caption>
              <thead><tr><th scope="col">M.CODE</th><th scope="col">{t('field.itemName')}</th><th scope="col">{t('catalog.columnCompany')}</th><th scope="col">{t('catalog.columnStatus')}</th><th scope="col">{t('catalog.columnUpdated')}</th><th scope="col"><span className="sr-only">{t('catalog.rowActions')}</span></th></tr></thead>
              <tbody>
                {recordPage?.items.map((record) => {
                  const auditOpen = auditPanel?.recordId === record.id
                  const recordLabel = record.mCode || record.itemName || record.id
                  return (
                    <Fragment key={record.id}>
                      <tr>
                        <td><span className="code-value">{record.mCode || '—'}</span></td>
                        <td className="item-name">{record.itemName || t('catalog.noName')}</td>
                        <td>{record.companyName || '—'}</td>
                        <td><span className="status-pill">{record.productStatus || t('catalog.noStatus')}</span></td>
                        <td className="date-cell">{formatLocaleDate(locale, record.updatedAt)}</td>
                        <td>
                          <div className="record-actions">
                            <button className="button button-quiet" type="button" onClick={() => void handleEdit(record.id)}>{t('catalog.edit')}</button>
                            <button className="button button-quiet" type="button" onClick={() => void handleDelete(record)}>{t('catalog.delete')}</button>
                            <button
                              className="button button-quiet"
                              type="button"
                              aria-label={`${t(auditOpen ? 'catalog.hideAudit' : 'catalog.showAudit')} ${recordLabel}`}
                              aria-expanded={auditOpen}
                              aria-controls={auditOpen ? 'record-audit-panel' : undefined}
                              onClick={() => void handleToggleAudit(record)}
                            >{t(auditOpen ? 'catalog.hideAudit' : 'catalog.audit')}</button>
                          </div>
                        </td>
                      </tr>
                      {auditOpen && auditPanel && (
                        <tr className="record-audit-row">
                          <td className="record-audit-cell" colSpan={6}>
                            <RecordAuditHistory
                              recordLabel={auditPanel.recordLabel}
                              events={auditPanel.events}
                              loading={auditPanel.loading}
                              error={auditPanel.error}
                              onClose={closeAuditPanel}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
            {!listBusy && recordPage?.items.length === 0 && (
              <div className="empty-state"><span className="empty-icon" aria-hidden="true">▤</span><h3>{hasActiveSearch ? t('catalog.noMatches') : t('catalog.emptyTitle')}</h3><p>{hasActiveSearch ? t('catalog.emptySearch') : t('catalog.emptyCatalog')}</p>{hasActiveSearch ? <button className="button button-secondary" type="button" onClick={handleClearSearch}>{t('catalog.clearSearch')}</button> : <button className="button button-secondary" type="button" onClick={() => setFormOpen(true)}>{t('app.createFirst')}</button>}</div>
            )}
            {listBusy && !recordPage && <p className="loading-state" role="status">{t('catalog.loadingRecords')}</p>}
          </div>
          <div className="pagination">
            <span>{recordPage ? t('catalog.showing', { shown: formatLocaleNumber(locale, recordPage.items.length), total: formatLocaleNumber(locale, recordPage.totalCount) }) : ''}</span>
            <div className="pagination-actions">
              <button className="button button-quiet" type="button" onClick={() => { closeAuditPanel(); setPage((current) => Math.max(1, current - 1)) }} disabled={page <= 1 || listBusy}>{t('catalog.previous')}</button>
              <button className="button button-quiet" type="button" onClick={() => { closeAuditPanel(); setPage((current) => Math.min(totalPages, current + 1)) }} disabled={page >= totalPages || listBusy}>{t('catalog.next')}</button>
            </div>
          </div>
        </section>
      </main>
      <footer className="app-footer"><span>Product Master Data</span><span>{t('app.footer')}</span></footer>
    </div>
  )
}

function App() {
  return <AppPreferencesProvider><AppContent /></AppPreferencesProvider>
}

export default App
