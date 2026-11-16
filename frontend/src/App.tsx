import { useEffect, useRef, useState, type FormEvent } from 'react'
import { buildCatalogQuery } from './catalog-search'
import { CatalogRecordDetail } from './catalog-cards'
import { CatalogRecordGallery, type CatalogGalleryRecord } from './catalog-record-gallery'
import { CompanyDirectory, type CompanyDirectoryItem } from './company-directory'
import { buildCompanyQuery } from './company-search'
import { createRecordDetailRequestGuard } from './record-detail-request'
import { WorkspaceNavigation, WorkspacePanel } from './workspace-navigation'
import { ImportColumnMapping as ImportColumnMappingView } from './import-column-mapping-view'
import { updateImportColumnMapping, type ImportColumnMapping, type ImportPreviewRow } from './import-column-mapping'
import { ImportHeaderDiagnostics } from './import-header-diagnostics'
import { createImportPreviewRequest, createImportValidationRequest } from './import-preview'
import { createImportCommitRequest, createImportHistoryRequest, importHistoryItemUrl, importHistoryUrl, type ImportBatchDetail, type ImportCommitResult, type ImportHistoryItem } from './import-commit'
import { ImportCommitSummary, ImportHistoryView } from './import-commit-view'
import { loadRecordAudit, type ProductRecordAuditEvent } from './record-audit'
import { RecordAuditHistory } from './record-audit-view'
import { AppPreferencesProvider } from './app-preferences'
import { PreferenceControls } from './preference-controls'
import { useAppPreferences } from './use-app-preferences'
import { localizeApiError } from './api-errors'
import { formatLocaleNumber, type MessageKey, type Translate } from './i18n'
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
type ProductRecordListItem = CatalogGalleryRecord
type ProductRecordPage = {
  items: ProductRecordListItem[]
  page: number
  pageSize: number
  totalCount: number
}
type CompanyDirectoryPage = { items: CompanyDirectoryItem[]; page: number; pageSize: number; totalCount: number }
type ProductRecordDetail = {
  [Key in keyof ProductRecordForm]: string | null
} & { id: string; createdAt: string; updatedAt: string; version: number }
type RecordAuditPanelState = {
  recordId: string
  recordLabel: string
  events: ProductRecordAuditEvent[]
  loading: boolean
  error: string
}
type ImportWorksheet = { name: string; headers: (string | null)[]; rows?: ImportPreviewRow[] }
type ImportPreview = { worksheets: ImportWorksheet[] }
type ImportValidation = { worksheetName: string; scannedRows: number; duplicateRows: number; issues: { rowNumber: number; code: string }[] }

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
  const [companyPage, setCompanyPage] = useState<CompanyDirectoryPage | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<CompanyDirectoryItem | null>(null)
  const [companyBusy, setCompanyBusy] = useState(false)
  const [companyError, setCompanyError] = useState('')
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<'catalog' | 'import'>('catalog')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileNavToggleRef = useRef<HTMLButtonElement>(null)
  const [selectedRecord, setSelectedRecord] = useState<ProductRecordDetail | null>(null)
  const [recordDetailBusy, setRecordDetailBusy] = useState(false)
  const [recordDetailError, setRecordDetailError] = useState('')
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
  const [importValidation, setImportValidation] = useState<ImportValidation | null>(null)
  const [importCommitResult, setImportCommitResult] = useState<ImportCommitResult | null>(null)
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([])
  const [importHistoryLoading, setImportHistoryLoading] = useState(false)
  const [importHistoryDetailLoading, setImportHistoryDetailLoading] = useState(false)
  const [importHistoryError, setImportHistoryError] = useState('')
  const [selectedImportBatchId, setSelectedImportBatchId] = useState<string | null>(null)
  const [selectedImportBatch, setSelectedImportBatch] = useState<ImportBatchDetail | null>(null)
  const [auditPanel, setAuditPanel] = useState<RecordAuditPanelState | null>(null)
  const auditRequestGeneration = useRef(0)
  const importHistoryListGeneration = useRef(0)
  const importHistoryDetailGeneration = useRef(0)
  const importSessionGeneration = useRef(0)
  const recordDetailRequestGuard = useRef(createRecordDetailRequestGuard())

  useEffect(() => {
    if (!mobileNavOpen) return
    document.getElementById('vault-sidebar-navigation')?.querySelector('button')?.focus()
  }, [mobileNavOpen])

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
    if (!identity || selectedCompany) return
    let cancelled = false
    const controller = new AbortController()
    const loadCompanies = async () => {
      setCompanyBusy(true)
      setCompanyError('')
      try {
        const query = buildCompanyQuery(page, pageSize, searchTerm)
        const response = await fetch(`/api/v1/companies?${query}`, { credentials: 'same-origin', signal: controller.signal })
        if (!response.ok) throw new Error(await responseMessage(response, t))
        const result = await response.json() as CompanyDirectoryPage
        if (!cancelled) setCompanyPage(result)
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === 'AbortError')) {
          setCompanyError(error instanceof Error ? error.message : t('error.catalogLoad'))
        }
      } finally {
        if (!cancelled) setCompanyBusy(false)
      }
    }
    void loadCompanies()
    return () => { cancelled = true; controller.abort() }
  }, [identity, page, searchTerm, listVersion, selectedCompany, t])

  useEffect(() => {
    if (!identity || !selectedCompany) return
    let cancelled = false
    const controller = new AbortController()
    const loadRecords = async () => {
      setListBusy(true)
      setListError('')
      try {
        const query = buildCatalogQuery(page, pageSize, searchTerm, filters, selectedCompany.companyName)
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
  }, [identity, page, listVersion, searchTerm, filters, selectedCompany, t])

  const handleApplyTextSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    closeAuditPanel()
    setPage(1)
    setSearchTerm(searchDraft)
  }

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
    const sessionGeneration = importSessionGeneration.current
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
      if (sessionGeneration !== importSessionGeneration.current) return
      if (worksheetName === undefined) {
        setImportPreview(preview)
        setSelectedWorksheetName(preview.worksheets[0]?.name ?? '')
        setRowPreview(null)
      } else {
        setRowPreview(preview.worksheets[0] ?? null)
      }
    } catch (error) {
      if (sessionGeneration === importSessionGeneration.current) {
        setImportError(error instanceof Error ? error.message : t('error.importRead'))
      }
    } finally {
      if (sessionGeneration === importSessionGeneration.current) setImportBusy(false)
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

  const handleValidateMCode = async () => {
    const mappedColumn = Object.entries(importColumnMapping).find(([, target]) => target === 'mCode')
    const columnNumber = Number(mappedColumn?.[0])
    if (!importFile || !selectedWorksheetName || !Number.isInteger(columnNumber) || columnNumber < 1) return
    const sessionGeneration = importSessionGeneration.current
    setImportError('')
    setImportValidation(null)
    setImportBusy(true)
    try {
      const token = await requestAntiforgeryToken(t)
      const response = await fetch('/api/v1/imports/validate', createImportValidationRequest(importFile, token, selectedWorksheetName, columnNumber))
      if (!response.ok) throw new Error(await responseMessage(response, t))
      const validation = await response.json() as ImportValidation
      if (sessionGeneration === importSessionGeneration.current) setImportValidation(validation)
    } catch (error) {
      if (sessionGeneration === importSessionGeneration.current) {
        setImportError(error instanceof Error ? error.message : t('error.importRead'))
      }
    } finally {
      if (sessionGeneration === importSessionGeneration.current) setImportBusy(false)
    }
  }

  const loadImportHistory = async () => {
    const sessionGeneration = importSessionGeneration.current
    const generation = ++importHistoryListGeneration.current
    setImportHistoryLoading(true)
    setImportHistoryError('')
    try {
      const response = await fetch(importHistoryUrl(), createImportHistoryRequest())
      if (!response.ok) throw new Error(await responseMessage(response, t))
      const result = await response.json() as { batches: ImportHistoryItem[] }
      if (sessionGeneration === importSessionGeneration.current
        && generation === importHistoryListGeneration.current) setImportHistory(result.batches)
    } catch (error) {
      if (sessionGeneration === importSessionGeneration.current
        && generation === importHistoryListGeneration.current) {
        setImportHistoryError(error instanceof Error ? error.message : t('error.importRead'))
      }
    } finally {
      if (sessionGeneration === importSessionGeneration.current
        && generation === importHistoryListGeneration.current) setImportHistoryLoading(false)
    }
  }

  const handleCommitImport = async () => {
    if (!importFile || !selectedWorksheetName || !rowPreview || !Object.keys(importColumnMapping).length) return
    if (!window.confirm(t('import.confirmCommit', { file: importFile.name }))) return
    const sessionGeneration = importSessionGeneration.current
    setImportError('')
    setImportBusy(true)
    try {
      const token = await requestAntiforgeryToken(t)
      const response = await fetch('/api/v1/imports/commit', createImportCommitRequest(importFile, token, selectedWorksheetName, importColumnMapping))
      if (!response.ok) throw new Error(await responseMessage(response, t))
      const result = await response.json() as ImportCommitResult
      if (sessionGeneration !== importSessionGeneration.current) return
      setImportCommitResult(result)
      setListVersion((version) => version + 1)
      await loadImportHistory()
    } catch (error) {
      if (sessionGeneration === importSessionGeneration.current) {
        setImportError(error instanceof Error ? error.message : t('error.importRead'))
      }
    } finally {
      if (sessionGeneration === importSessionGeneration.current) setImportBusy(false)
    }
  }

  const handleSelectImportBatch = async (batchId: string) => {
    const sessionGeneration = importSessionGeneration.current
    const generation = ++importHistoryDetailGeneration.current
    setSelectedImportBatchId(batchId)
    setImportHistoryDetailLoading(true)
    setImportHistoryError('')
    try {
      const response = await fetch(importHistoryItemUrl(batchId), createImportHistoryRequest())
      if (!response.ok) throw new Error(await responseMessage(response, t))
      const detail = await response.json() as ImportBatchDetail
      if (sessionGeneration === importSessionGeneration.current
        && generation === importHistoryDetailGeneration.current) setSelectedImportBatch(detail)
    } catch (error) {
      if (sessionGeneration === importSessionGeneration.current
        && generation === importHistoryDetailGeneration.current) {
        setImportHistoryError(error instanceof Error ? error.message : t('error.importRead'))
      }
    } finally {
      if (sessionGeneration === importSessionGeneration.current
        && generation === importHistoryDetailGeneration.current) setImportHistoryDetailLoading(false)
    }
  }

  useEffect(() => {
    if (!identity) return
    let active = true
    const generation = ++importHistoryListGeneration.current
    const load = async () => {
      try {
        const response = await fetch(importHistoryUrl(), createImportHistoryRequest())
        if (!response.ok) throw new Error(await responseMessage(response, t))
        const result = await response.json() as { batches: ImportHistoryItem[] }
        if (active && generation === importHistoryListGeneration.current) {
          setImportHistory(result.batches)
          setImportHistoryError('')
        }
      } catch (error) {
        if (active && generation === importHistoryListGeneration.current) {
          setImportHistoryError(error instanceof Error ? error.message : t('error.importRead'))
        }
      } finally {
        if (active && generation === importHistoryListGeneration.current) setImportHistoryLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [identity, t])

  const closeAuditPanel = () => {
    auditRequestGeneration.current += 1
    setAuditPanel(null)
  }

  const handleToggleAudit = async (record: ProductRecordDetail) => {
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
      importSessionGeneration.current += 1
      importHistoryListGeneration.current += 1
      importHistoryDetailGeneration.current += 1
      recordDetailRequestGuard.current.invalidate()
      setImportFile(null)
      setImportPreview(null)
      setSelectedWorksheetName('')
      setRowPreview(null)
      setImportColumnMapping({})
      setImportError('')
      setImportBusy(false)
      setImportValidation(null)
      setImportCommitResult(null)
      setImportHistory([])
      setImportHistoryLoading(false)
      setImportHistoryDetailLoading(false)
      setImportHistoryError('')
      setSelectedImportBatchId(null)
      setSelectedImportBatch(null)
      setSelectedRecord(null)
      setRecordDetailBusy(false)
      setRecordDetailError('')
      setActiveWorkspaceView('catalog')
      setMobileNavOpen(false)
      setIdentity(null)
      setRecordPage(null)
      setCompanyPage(null)
      setSelectedCompany(null)
      setCompanyBusy(false)
      setListBusy(false)
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

  const handleOpenRecordDetail = async (recordId: string) => {
    const requestGeneration = recordDetailRequestGuard.current.begin()
    setSelectedRecord(null)
    setRecordDetailError('')
    setRecordDetailBusy(true)
    closeAuditPanel()
    try {
      const response = await fetch(`/api/v1/records/${recordId}`, { credentials: 'same-origin' })
      if (!response.ok) throw new Error(await responseMessage(response, t))
      const record = await response.json() as ProductRecordDetail
      if (recordDetailRequestGuard.current.isCurrent(requestGeneration)) setSelectedRecord(record)
    } catch (error) {
      if (recordDetailRequestGuard.current.isCurrent(requestGeneration)) {
        setRecordDetailError(error instanceof Error ? error.message : t('error.detailLoad'))
      }
    } finally {
      if (recordDetailRequestGuard.current.isCurrent(requestGeneration)) setRecordDetailBusy(false)
    }
  }

  const handleCloseRecordDetail = () => {
    recordDetailRequestGuard.current.invalidate()
    setSelectedRecord(null)
    setRecordDetailBusy(false)
    setRecordDetailError('')
    closeAuditPanel()
  }

  const handleEdit = (record: ProductRecordDetail) => {
    setFormError('')
    setNotice('')
    const values = Object.fromEntries(formFields.map(({ key }) => [key, record[key] ?? ''])) as ProductRecordForm
    setForm(values)
    setEditingRecord({ id: record.id, version: record.version })
    handleCloseRecordDetail()
    setFormOpen(true)
  }

  const handleDelete = async (record: ProductRecordDetail) => {
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
      handleCloseRecordDetail()
      setListVersion((version) => version + 1)
      setNotice(t('error.deleteSuccess'))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('error.deleteFailed'))
    }
  }

  const selectedAuditOpen = selectedRecord !== null && auditPanel?.recordId === selectedRecord.id
  const selectedRecordLabel = selectedRecord ? selectedRecord.mCode || selectedRecord.itemName || selectedRecord.id : ''
  const closeMobileNavigation = () => {
    setMobileNavOpen(false)
    mobileNavToggleRef.current?.focus()
  }

  if (!identity) {
    return (
      <main className="vault-login-page">
        <header className="vault-login-header">
          <a className="brand" href="/" aria-label={t('brand.catalogLabel')}>
            <span className="brand-mark" aria-hidden="true">PM</span>
            <span><strong>Product Master Data</strong><small>{t('brand.workspace')}</small></span>
          </a>
          <PreferenceControls />
        </header>
        <section className="vault-login-layout" aria-labelledby="login-title">
          <div className="vault-login-card">
            <div className="vault-login-card-heading">
              <p className="eyebrow">{t('login.internal')}</p>
              <h1 id="login-title">{t('login.title')}</h1>
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
          </div>
        </section>
        <footer className="vault-login-footer">Product Master Data · {t('app.footer')}</footer>
      </main>
    )
  }

  const totalPages = Math.max(1, Math.ceil(((selectedCompany ? recordPage?.totalCount : companyPage?.totalCount) ?? 0) / pageSize))
  const activeFilterCount = formFields.filter(({ key }) => filters[key].trim()).length
  const hasActiveSearch = Boolean(searchTerm.trim() || activeFilterCount)

  return (
    <div
      className={`vault-app-shell${sidebarCollapsed ? ' vault-sidebar-collapsed' : ''}${mobileNavOpen ? ' vault-mobile-nav-open' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && mobileNavOpen) {
          event.preventDefault()
          closeMobileNavigation()
        }
      }}
    >
      {mobileNavOpen && <button className="vault-nav-backdrop" type="button" tabIndex={-1} aria-label={t('app.navigationClose')} onClick={closeMobileNavigation} />}
      <aside className="vault-sidebar">
        <a className="brand" href="#catalog" aria-label={t('brand.catalogLabel')}>
          <span className="brand-mark" aria-hidden="true">PM</span>
          <span><strong>Product Master Data</strong><small>{t('brand.workspace')}</small></span>
        </a>
        <WorkspaceNavigation
          activeView={activeWorkspaceView}
          labels={{ navigation: t('app.navigation'), section: t('app.archiveSection'), catalog: t('app.catalogTab'), import: t('app.importTab') }}
          onSelect={(view) => { setActiveWorkspaceView(view); if (mobileNavOpen) closeMobileNavigation() }}
        />
        <div className="vault-sidebar-footer"><span>Product Master Data</span><small>{t('app.footer')}</small></div>
      </aside>
      <div className="vault-main">
      <header className="vault-topbar">
        <div className="vault-topbar-start">
          <button
            className="vault-sidebar-toggle vault-desktop-only"
            type="button"
            aria-label={t(sidebarCollapsed ? 'app.sidebarExpand' : 'app.sidebarCollapse')}
            aria-expanded={!sidebarCollapsed}
            aria-controls="vault-sidebar-navigation"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.75" y="3.5" width="14.5" height="13" rx="1.5" /><path d="M7.5 3.5v13M10.5 7.5h4m-4 2.5h4m-4 2.5h3" /></svg>
          </button>
          <button
            className="vault-sidebar-toggle vault-mobile-only"
            type="button"
            ref={mobileNavToggleRef}
            aria-label={t(mobileNavOpen ? 'app.navigationClose' : 'app.navigationOpen')}
            aria-expanded={mobileNavOpen}
            aria-controls="vault-sidebar-navigation"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 5h14M3 10h14M3 15h14" /></svg>
          </button>
          {activeWorkspaceView === 'catalog' && !selectedRecord && !recordDetailBusy && !recordDetailError && (
            <form className="vault-header-search" onSubmit={handleApplyTextSearch}>
              <label className="sr-only" htmlFor="catalog-search-input">{t('catalog.searchLabel')}</label>
              <svg className="vault-search-icon" aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8.75" cy="8.75" r="5.75" /><path d="m13 13 4 4" /></svg>
              <input id="catalog-search-input" type="search" placeholder={t('catalog.searchPlaceholder')} value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} aria-describedby="catalog-search-hint" />
              <button className="vault-search-submit" type="submit" aria-label={t('catalog.search')}>
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8.75" cy="8.75" r="5.75" /><path d="m13 13 4 4" /></svg>
              </button>
            </form>
          )}
        </div>
        <div className="vault-topbar-actions">
          <PreferenceControls />
          <div className="vault-user">
            <span className="vault-user-avatar" aria-hidden="true">{(identity.email ?? identity.userId ?? 'U').slice(0, 1).toUpperCase()}</span>
            <span className="user-email">{identity.email ?? identity.userId ?? t('app.userFallback')}</span>
          </div>
          <button className="button button-quiet vault-logout" type="button" onClick={handleLogout} disabled={logoutBusy}>
            {logoutBusy ? t('app.logoutBusy') : t('app.logout')}
          </button>
        </div>
      </header>

      <main className="workspace" id="catalog">
        <div className="page-heading">
          <div>
            <nav className="vault-breadcrumb" aria-label={t('app.navigation')}>
              <span>Product Master Data</span><span aria-hidden="true">/</span>
              <span>{activeWorkspaceView === 'catalog' ? t('app.catalogTab') : t('app.importTab')}</span>
            </nav>
            <p className="eyebrow">{t(activeWorkspaceView === 'catalog' ? 'app.catalogEyebrow' : 'import.eyebrow')}</p>
            <h1>{activeWorkspaceView === 'catalog' ? t('app.title') : t('app.importTab')}</h1>
            <p className="page-subtitle">{activeWorkspaceView === 'catalog' ? t('app.subtitle') : t('app.importSubtitle')}</p>
          </div>
          {activeWorkspaceView === 'catalog' && !selectedRecord && (
            <button className="button button-primary" type="button" onClick={() => { setFormError(''); setEditingRecord(null); setForm(emptyForm()); setFormOpen((open) => !open) }}>
              <span aria-hidden="true">＋</span> {t('app.createRecord')}
            </button>
          )}
        </div>

        {notice && <p className="alert alert-success" role="status">{notice}</p>}

        {activeWorkspaceView === 'catalog' && formOpen && (
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

        <WorkspacePanel activeView={activeWorkspaceView} view="import" className="import-workspace" ariaLabel={t('app.importTab')}>
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
              onChange={(event) => { setImportFile(event.target.files?.[0] ?? null); setImportPreview(null); setSelectedWorksheetName(''); setRowPreview(null); setImportColumnMapping({}); setImportValidation(null); setImportError('') }}
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
                      onChange={(event) => { setSelectedWorksheetName(event.target.value); setRowPreview(null); setImportColumnMapping({}); setImportValidation(null); setImportError('') }}
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
                          onChange={(columnNumber, targetKey) => { setImportValidation(null); setImportColumnMapping((current) => updateImportColumnMapping(current, columnNumber, targetKey, localizedFormFields)) }}
                        />
                        <button className="button button-secondary" type="button" disabled={importBusy || !rowPreview || !Object.values(importColumnMapping).includes('mCode')} onClick={() => void handleValidateMCode()}>
                          {importBusy ? t('import.validatingMCode') : t('import.validateMCode')}
                        </button>
                      </>
                    ) : <p>{t('import.noHeaders')}</p>}
                  </section>
                ))}
              </div>
              {importValidation && (
                <section className="import-row-preview" aria-live="polite" aria-labelledby="import-validation-title">
                  <h3 id="import-validation-title">{t('import.validationSummary', { scanned: formatLocaleNumber(locale, importValidation.scannedRows), duplicates: formatLocaleNumber(locale, importValidation.duplicateRows) })}</h3>
                  {importValidation.issues.length > 0 && <ul>{importValidation.issues.map((issue) => <li key={issue.rowNumber}>{t('import.duplicateAtRow', { row: formatLocaleNumber(locale, issue.rowNumber) })}</li>)}</ul>}
                  <p className="import-preview-note">{t('import.validationNote')}</p>
                </section>
              )}
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
              {rowPreview && Object.keys(importColumnMapping).length > 0 && (
                <button className="button button-primary" type="button" disabled={importBusy} onClick={() => void handleCommitImport()}>
                  {importBusy ? t('import.commitBusy') : t('import.commitAction')}
                </button>
              )}
              {importCommitResult && <ImportCommitSummary result={importCommitResult} locale={locale} t={t} />}
            </>
          )}
        </section>

        <ImportHistoryView
          items={importHistory}
          selectedBatchId={selectedImportBatchId}
          selectedDetail={selectedImportBatch}
          loading={importHistoryLoading}
          detailLoading={importHistoryDetailLoading}
          error={importHistoryError}
          locale={locale}
          t={t}
          onRefresh={() => void loadImportHistory()}
          onSelect={(batchId) => void handleSelectImportBatch(batchId)}
        />
        </WorkspacePanel>

        <WorkspacePanel activeView={activeWorkspaceView} view="catalog" className="catalog-card" ariaLabel={t('catalog.title')}>
          {recordDetailBusy && <p className="loading-state" role="status">{t('catalog.detailLoading')}</p>}
          {recordDetailError && (
            <div className="catalog-detail-error">
              <p className="alert alert-error" role="alert">{recordDetailError}</p>
              <button className="button button-quiet" type="button" onClick={handleCloseRecordDetail}>{t('catalog.detailBack')}</button>
            </div>
          )}
          {!recordDetailBusy && !recordDetailError && selectedRecord && (
                      <>
                <div className="catalog-record-detail-actions">
                  <button className="button button-quiet" type="button" onClick={handleCloseRecordDetail}>{t('catalog.detailBack')}</button>
                  <div className="record-actions">
                    <button className="button button-quiet" type="button" onClick={() => handleEdit(selectedRecord)}>{t('catalog.edit')}</button>
                    <button className="button button-quiet" type="button" onClick={() => void handleDelete(selectedRecord)}>{t('catalog.delete')}</button>
                    <button
                      className="button button-quiet"
                      type="button"
                      aria-label={`${t(selectedAuditOpen ? 'catalog.hideAudit' : 'catalog.showAudit')} ${selectedRecordLabel}`}
                      aria-expanded={selectedAuditOpen}
                      aria-controls={selectedAuditOpen ? 'record-audit-panel' : undefined}
                      onClick={() => void handleToggleAudit(selectedRecord)}
                    >{t(selectedAuditOpen ? 'catalog.hideAudit' : 'catalog.audit')}</button>
                  </div>
                </div>
                <CatalogRecordDetail
                  record={selectedRecord}
                  fields={localizedFormFields}
                  emptyValue="—"
                  noCompanyLabel={t('catalog.noCompanyName')}
                  noImageLabel={t('catalog.noPicImage')}
                />
                {selectedAuditOpen && auditPanel && (
                  <div className="record-audit-detail">
                    <RecordAuditHistory
                      recordLabel={auditPanel.recordLabel}
                      events={auditPanel.events}
                      loading={auditPanel.loading}
                      error={auditPanel.error}
                      onClose={closeAuditPanel}
                    />
                  </div>
                )}
            </>
          )}
          {!recordDetailBusy && !recordDetailError && !selectedRecord && (
            <>
              <div className="catalog-toolbar">
                <div>
                  <h2 id="records-title">{selectedCompany ? (selectedCompany.companyName ?? t('catalog.noCompanyName')) : t('company.title')}</h2>
                  <p>{selectedCompany
                    ? recordPage ? t('catalog.totalCount', { count: formatLocaleNumber(locale, recordPage.totalCount) }) : t('catalog.loading')
                    : companyPage ? t('company.totalCount', { count: formatLocaleNumber(locale, companyPage.totalCount) }) : t('catalog.loading')}</p>
                  <p className="catalog-search-hint" id="catalog-search-hint">{t('catalog.searchHint')}</p>
                </div>
                <div className="catalog-toolbar-actions">
                  {selectedCompany ? <button className="button button-secondary" type="button" onClick={() => { setListBusy(false); setRecordPage(null); setSelectedCompany(null); setPage(1) }}>{t('company.back')}</button> : null}
                  {selectedCompany ? <button
                    className="button button-secondary"
                    type="button"
                    aria-expanded={filtersOpen}
                    aria-controls={filtersOpen ? 'catalog-field-filters' : undefined}
                    onClick={() => setFiltersOpen((open) => !open)}
                  >
                    {t('catalog.filter')}{activeFilterCount ? ` (${formatLocaleNumber(locale, activeFilterCount)})` : ''}
                  </button> : null}
                  <span className="page-indicator">{t('catalog.page', { page: formatLocaleNumber(locale, page), total: formatLocaleNumber(locale, totalPages) })}</span>
                </div>
              </div>
              {(selectedCompany ? listError : companyError) && <p className="alert alert-error" role="alert">{selectedCompany ? listError : companyError}</p>}
              {selectedCompany && filtersOpen && (
                <form className="catalog-filter-form" id="catalog-field-filters" onSubmit={handleApplySearch}>
                  <div className="field-filters">
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
                </form>
              )}
              <div className="catalog-record-list" aria-busy={selectedCompany ? listBusy : companyBusy}>
                {!selectedCompany && companyPage?.items.length ? <CompanyDirectory
                  companies={companyPage.items}
                  labels={{ caption: t('company.caption'), open: t('company.open'), noCompany: t('catalog.noCompanyName'), itemCount: t('company.itemCount') }}
                  onSelect={(company) => { setRecordPage(null); setSelectedCompany(company); setPage(1) }}
                /> : null}
                {selectedCompany && recordPage?.items.length ? (
                  <CatalogRecordGallery
                    records={recordPage.items}
                    labels={{
                      caption: t('catalog.galleryCaption'),
                      mCode: t('field.mCode'), itemCode: t('field.itemCode'),
                      open: t('catalog.openRecord'), noCompany: t('catalog.noCompanyName'), noImage: t('catalog.noPicImage'),
                      emptyValue: t('catalog.emptyValue'),
                    }}
                    onSelect={(id) => void handleOpenRecordDetail(id)}
                  />
                ) : null}
                {selectedCompany && !listBusy && recordPage?.items.length === 0 && (
                  <div className="empty-state"><span className="empty-icon" aria-hidden="true">▤</span><h3>{hasActiveSearch ? t('catalog.noMatches') : t('catalog.emptyTitle')}</h3><p>{hasActiveSearch ? t('catalog.emptySearch') : t('catalog.emptyCatalog')}</p>{hasActiveSearch ? <button className="button button-secondary" type="button" onClick={handleClearSearch}>{t('catalog.clearSearch')}</button> : <button className="button button-secondary" type="button" onClick={() => setFormOpen(true)}>{t('app.createFirst')}</button>}</div>
                )}
                {selectedCompany && listBusy && !recordPage && <p className="loading-state" role="status">{t('catalog.loadingRecords')}</p>}
                {!selectedCompany && companyBusy && !companyPage && <p className="loading-state" role="status">{t('catalog.loading')}</p>}
                {!selectedCompany && !companyBusy && companyPage?.items.length === 0 && <div className="empty-state"><h3>{t('company.empty')}</h3></div>}
              </div>
              <div className="pagination">
                <span>{selectedCompany && recordPage ? t('catalog.showing', { shown: formatLocaleNumber(locale, recordPage.items.length), total: formatLocaleNumber(locale, recordPage.totalCount) }) : ''}</span>
                <div className="pagination-actions">
                  <button className="button button-quiet" type="button" onClick={() => { closeAuditPanel(); setPage((current) => Math.max(1, current - 1)) }} disabled={page <= 1 || listBusy || companyBusy}>{t('catalog.previous')}</button>
                  <button className="button button-quiet" type="button" onClick={() => { closeAuditPanel(); setPage((current) => Math.min(totalPages, current + 1)) }} disabled={page >= totalPages || listBusy || companyBusy}>{t('catalog.next')}</button>
                </div>
              </div>
            </>
          )}
        </WorkspacePanel>
      </main>
      </div>
    </div>
  )
}

function App() {
  return <AppPreferencesProvider><AppContent /></AppPreferencesProvider>
}

export default App
