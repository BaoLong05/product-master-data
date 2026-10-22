import { useEffect, useState, type FormEvent } from 'react'
import { buildCatalogQuery } from './catalog-search'
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

const pageSize = 50
const formFields: { key: keyof ProductRecordForm; label: string; multiline?: boolean }[] = [
  { key: 'dateValue', label: 'Date' },
  { key: 'companyName', label: 'Company name' },
  { key: 'itemName', label: 'Item name' },
  { key: 'mCode', label: 'M.CODE' },
  { key: 'itemCode', label: 'Item code' },
  { key: 'productType', label: 'Product type' },
  { key: 'productStatus', label: 'Product status' },
  { key: 'approvalStatus', label: 'Approval status' },
  { key: 'sampleOrProductionOrder', label: 'Sample / production order' },
  { key: 'companyNameLetters', label: 'Company name (letters)' },
  { key: 'oldRegion', label: 'Old region' },
  { key: 'sampleSavedDate', label: 'Sample saved date' },
  { key: 'picImage', label: 'PIC image' },
  { key: 'purchaseOrder', label: 'Purchase order' },
  { key: 'productionOrderPdf', label: 'Production order PDF' },
  { key: 'note', label: 'Note', multiline: true },
  { key: 'printedAt', label: 'Printed at' },
  { key: 'discName', label: 'Disc name' },
  { key: 'soi', label: 'SOI' },
  { key: 'maso', label: 'Mã số' },
  { key: 'denier', label: 'Denier' },
  { key: 'price', label: 'Price' },
  { key: 'region', label: 'Region' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'picUrl', label: 'PIC URL' },
  { key: 'internalItem', label: 'Internal item' },
  { key: 'request', label: 'Request', multiline: true },
]

const emptyForm = (): ProductRecordForm => Object.fromEntries(
  formFields.map(({ key }) => [key, '']),
) as ProductRecordForm

async function requestAntiforgeryToken(): Promise<string> {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin' })
  if (!response.ok) throw new Error('Không thể khởi tạo phiên bảo mật. Vui lòng thử lại.')
  const result = await response.json() as { requestToken?: string | null }
  if (!result.requestToken) throw new Error('Không nhận được mã bảo mật từ máy chủ.')
  return result.requestToken
}

async function responseMessage(response: Response): Promise<string> {
  if (response.status === 403) return 'Tài khoản không có quyền thực hiện thao tác này.'
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string') {
      return body.message
    }
  } catch {
    // Use the status-based fallback when the response is not JSON.
  }
  return `Yêu cầu thất bại (HTTP ${response.status}).`
}

function App() {
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

  useEffect(() => {
    let cancelled = false
    const loadIdentity = async () => {
      try {
        const response = await fetch('/api/v1/auth/me', { credentials: 'same-origin' })
        if (response.status === 401) return
        if (!response.ok) throw new Error('Không thể kiểm tra phiên đăng nhập.')
        const currentIdentity = await response.json() as CurrentIdentity
        if (!cancelled) setIdentity(currentIdentity)
      } catch {
        if (!cancelled) setSessionError('Không thể kết nối máy chủ. Hãy kiểm tra API đã được khởi động chưa.')
      }
    }
    void loadIdentity()
    return () => { cancelled = true }
  }, [])

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
        if (!response.ok) throw new Error(await responseMessage(response))
        const result = await response.json() as ProductRecordPage
        if (!cancelled) setRecordPage(result)
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === 'AbortError')) {
          setListError(error instanceof Error ? error.message : 'Không thể tải danh mục sản phẩm.')
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
  }, [identity, page, listVersion, searchTerm, filters])

  const handleApplySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setSearchTerm(searchDraft)
    setFilters(filtersDraft)
  }

  const handleClearSearch = () => {
    setSearchDraft('')
    setSearchTerm('')
    setFiltersDraft(emptyForm())
    setFilters(emptyForm())
    setPage(1)
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    setLoginBusy(true)
    try {
      const requestToken = await requestAntiforgeryToken()
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': requestToken },
        body: JSON.stringify({ userName, password }),
      })
      if (!response.ok) {
        setLoginError('Đăng nhập không thành công. Hãy kiểm tra tên đăng nhập và mật khẩu.')
        return
      }
      const identityResponse = await fetch('/api/v1/auth/me', { credentials: 'same-origin' })
      if (!identityResponse.ok) throw new Error('Đã tạo phiên nhưng không tải được hồ sơ người dùng.')
      setIdentity(await identityResponse.json() as CurrentIdentity)
      setPassword('')
      setSessionError('')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Không thể đăng nhập.')
    } finally {
      setLoginBusy(false)
    }
  }

  const handleLogout = async () => {
    setLogoutBusy(true)
    setNotice('')
    try {
      const requestToken = await requestAntiforgeryToken()
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': requestToken },
      })
      if (!response.ok) throw new Error(await responseMessage(response))
      setIdentity(null)
      setRecordPage(null)
      setFormOpen(false)
      setEditingRecord(null)
      setForm(emptyForm())
      handleClearSearch()
      setFiltersOpen(false)
      setSessionError('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không thể đăng xuất.')
    } finally {
      setLogoutBusy(false)
    }
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSaveBusy(true)
    try {
      const requestToken = await requestAntiforgeryToken()
      const response = await fetch(editingRecord ? `/api/v1/records/${editingRecord.id}` : '/api/v1/records', {
        method: editingRecord ? 'PUT' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': requestToken },
        body: JSON.stringify(editingRecord ? { ...form, version: editingRecord.version } : form),
      })
      if (!response.ok) throw new Error(await responseMessage(response))
      setForm(emptyForm())
      setEditingRecord(null)
      setFormOpen(false)
      setPage(1)
      setListVersion((version) => version + 1)
      setNotice('Đã lưu hồ sơ sản phẩm.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu hồ sơ sản phẩm.')
    } finally {
      setSaveBusy(false)
    }
  }

  const handleEdit = async (id: string) => {
    setFormError('')
    setNotice('')
    try {
      const response = await fetch(`/api/v1/records/${id}`, { credentials: 'same-origin' })
      if (!response.ok) throw new Error(await responseMessage(response))
      const record = await response.json() as ProductRecordDetail
      const values = Object.fromEntries(formFields.map(({ key }) => [key, record[key] ?? ''])) as ProductRecordForm
      setForm(values)
      setEditingRecord({ id: record.id, version: record.version })
      setFormOpen(true)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không thể tải hồ sơ để chỉnh sửa.')
    }
  }

  const handleDelete = async (record: ProductRecordListItem) => {
    if (!window.confirm(`Xóa mềm hồ sơ ${record.mCode || record.itemName || record.id}? Hồ sơ sẽ được giữ lại trong lịch sử.`)) return
    setNotice('')
    try {
      const requestToken = await requestAntiforgeryToken()
      const response = await fetch(`/api/v1/records/${record.id}?version=${record.version}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': requestToken },
      })
      if (!response.ok) throw new Error(await responseMessage(response))
      setListVersion((version) => version + 1)
      setNotice('Đã chuyển hồ sơ vào trạng thái đã xóa mềm.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không thể xóa hồ sơ.')
    }
  }

  if (!identity) {
    return (
      <main className="login-page">
        <section className="login-card" aria-labelledby="login-title">
          <div className="brand-mark" aria-hidden="true">PM</div>
          <p className="eyebrow">PRODUCT MASTER DATA</p>
          <h1 id="login-title">Đăng nhập vào hệ thống</h1>
          <p className="login-copy">Quản lý tập trung danh mục hồ sơ sản phẩm.</p>
          {(loginError || sessionError) && <p className="alert alert-error" role="alert">{loginError || sessionError}</p>}
          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="userName">Tên đăng nhập</label>
            <input id="userName" autoComplete="username" value={userName} onChange={(event) => setUserName(event.target.value)} required />
            <label htmlFor="password">Mật khẩu</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button className="button button-primary login-submit" type="submit" disabled={loginBusy}>
              {loginBusy ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
          <p className="login-footnote">Quyền truy cập được cấp bởi quản trị viên tổ chức.</p>
        </section>
      </main>
    )
  }

  const totalPages = Math.max(1, Math.ceil((recordPage?.totalCount ?? 0) / pageSize))
  const activeFilterCount = formFields.filter(({ key }) => filters[key].trim()).length
  const hasActiveSearch = Boolean(searchTerm.trim() || activeFilterCount)

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#catalog" aria-label="Product Master Data — danh mục sản phẩm">
          <span className="brand-mark" aria-hidden="true">PM</span>
          <span><strong>Product Master Data</strong><small>CATALOG WORKSPACE</small></span>
        </a>
        <div className="topbar-actions">
          <span className="user-email">{identity.email ?? identity.userId}</span>
          <button className="button button-quiet" type="button" onClick={handleLogout} disabled={logoutBusy}>
            {logoutBusy ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </button>
        </div>
      </header>

      <main className="workspace" id="catalog">
        <div className="page-heading">
          <div>
            <p className="eyebrow">DANH MỤC · MASTER DATA</p>
            <h1>Hồ sơ sản phẩm</h1>
            <p className="page-subtitle">Danh sách tập trung và các giá trị gốc của dữ liệu sản phẩm.</p>
          </div>
          <button className="button button-primary" type="button" onClick={() => { setFormError(''); setEditingRecord(null); setForm(emptyForm()); setFormOpen((open) => !open) }}>
            <span aria-hidden="true">＋</span> Tạo hồ sơ
          </button>
        </div>

        {notice && <p className="alert alert-success" role="status">{notice}</p>}

        {formOpen && (
          <section className="form-card" aria-labelledby="form-title">
            <div className="section-heading">
              <div><p className="eyebrow">{editingRecord ? 'CHỈNH SỬA HỒ SƠ' : 'HỒ SƠ MỚI'}</p><h2 id="form-title">Thông tin sản phẩm</h2></div>
              <button className="button button-quiet" type="button" onClick={() => { setFormOpen(false); setEditingRecord(null) }}>Đóng</button>
            </div>
            <p className="form-hint">Tất cả trường đều không bắt buộc. Giá trị được lưu dưới dạng văn bản; M.CODE phải duy nhất nếu được nhập. Khi chỉnh sửa, các trường để trống sẽ được lưu là rỗng.</p>
            {formError && <p className="alert alert-error" role="alert">{formError}</p>}
            <form onSubmit={handleSave}>
              <div className="form-grid">
                {formFields.map(({ key, label, multiline }) => (
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
                <button className="button button-quiet" type="button" onClick={() => { setFormOpen(false); setEditingRecord(null) }}>Hủy</button>
                <button className="button button-primary" type="submit" disabled={saveBusy}>{saveBusy ? 'Đang lưu…' : editingRecord ? 'Lưu thay đổi' : 'Lưu hồ sơ'}</button>
              </div>
            </form>
          </section>
        )}

        <section className="catalog-card" aria-labelledby="records-title">
          <div className="catalog-toolbar">
            <div><h2 id="records-title">Tất cả hồ sơ</h2><p>{recordPage ? `${recordPage.totalCount.toLocaleString('vi-VN')} hồ sơ` : 'Đang tải danh mục…'}</p></div>
            <span className="page-indicator">Trang {page}/{totalPages}</span>
          </div>
          {listError && <p className="alert alert-error" role="alert">{listError}</p>}
          <form className="catalog-search" onSubmit={handleApplySearch}>
            <div className="search-row">
              <label className="sr-only" htmlFor="catalog-search-input">Tìm kiếm trên tất cả trường dữ liệu</label>
              <input
                id="catalog-search-input"
                type="search"
                placeholder="Tìm trong 27 trường dữ liệu…"
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
                Bộ lọc {activeFilterCount ? `(${activeFilterCount})` : ''}
              </button>
              <button className="button button-primary" type="submit">Tìm kiếm</button>
            </div>
            <p className="search-hint">Tìm kiếm không phân biệt hoa/thường; có thể lọc riêng từng trường.</p>
            {filtersOpen && (
              <div className="field-filters" id="catalog-field-filters">
                {formFields.map(({ key, label }) => (
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
                  <button className="button button-quiet" type="button" onClick={handleClearSearch}>Xóa bộ lọc</button>
                  <button className="button button-primary" type="submit">Áp dụng lọc</button>
                </div>
              </div>
            )}
          </form>
          <div className="table-scroll" aria-busy={listBusy}>
            <table>
              <caption className="sr-only">Danh sách hồ sơ sản phẩm</caption>
              <thead><tr><th scope="col">M.CODE</th><th scope="col">Tên sản phẩm</th><th scope="col">Công ty</th><th scope="col">Trạng thái</th><th scope="col">Cập nhật</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead>
              <tbody>
                {recordPage?.items.map((record) => (
                  <tr key={record.id}>
                    <td><span className="code-value">{record.mCode || '—'}</span></td>
                    <td className="item-name">{record.itemName || 'Chưa có tên'}</td>
                    <td>{record.companyName || '—'}</td>
                    <td><span className="status-pill">{record.productStatus || 'Chưa cập nhật'}</span></td>
                    <td className="date-cell">{new Date(record.updatedAt).toLocaleDateString('vi-VN')}</td>
                    <td><div className="pagination-actions"><button className="button button-quiet" type="button" onClick={() => void handleEdit(record.id)}>Sửa</button><button className="button button-quiet" type="button" onClick={() => void handleDelete(record)}>Xóa</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!listBusy && recordPage?.items.length === 0 && (
              <div className="empty-state"><span className="empty-icon" aria-hidden="true">▤</span><h3>{hasActiveSearch ? 'Không tìm thấy hồ sơ phù hợp' : 'Danh mục chưa có dữ liệu'}</h3><p>{hasActiveSearch ? 'Thử thay đổi từ khóa hoặc bộ lọc để tìm hồ sơ.' : 'Tạo hồ sơ đầu tiên để bắt đầu quản lý danh mục sản phẩm.'}</p>{hasActiveSearch ? <button className="button button-secondary" type="button" onClick={handleClearSearch}>Xóa tìm kiếm và bộ lọc</button> : <button className="button button-secondary" type="button" onClick={() => setFormOpen(true)}>Tạo hồ sơ đầu tiên</button>}</div>
            )}
            {listBusy && !recordPage && <p className="loading-state" role="status">Đang tải hồ sơ…</p>}
          </div>
          <div className="pagination">
            <span>{recordPage ? `Đang hiển thị ${recordPage.items.length}/${recordPage.totalCount.toLocaleString('vi-VN')}` : ''}</span>
            <div className="pagination-actions">
              <button className="button button-quiet" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || listBusy}>Trước</button>
              <button className="button button-quiet" type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || listBusy}>Sau</button>
            </div>
          </div>
        </section>
      </main>
      <footer className="app-footer"><span>Product Master Data</span><span>Danh mục nội bộ của tổ chức</span></footer>
    </div>
  )
}

export default App
