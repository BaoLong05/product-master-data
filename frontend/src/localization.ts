export type Locale = 'vi' | 'en' | 'ko'
export type Theme = 'light' | 'dark'
export type MessageValues = Record<string, string | number>
export type MessageKey = 'prefs.language' | 'prefs.group' | 'prefs.switchToDark' | 'prefs.switchToLight' | 'prefs.light' | 'prefs.dark' | 'brand.workspace' | 'brand.catalogLabel' | 'login.storyEyebrow' | 'login.storyTitle' | 'login.storyDescription' | 'login.sourceFields' | 'login.catalogManaged' | 'login.internal' | 'login.title' | 'login.copy' | 'login.username' | 'login.password' | 'login.busy' | 'login.submit' | 'login.footnote' | 'error.csrfInit' | 'error.csrfToken' | 'error.forbidden' | 'error.httpStatus' | 'error.sessionUnavailable' | 'error.connection' | 'error.catalogLoad' | 'error.importPick' | 'error.importRead' | 'error.worksheetRequired' | 'error.auditLoad' | 'error.loginFailed' | 'error.loginSession' | 'error.loginUnavailable' | 'error.logoutUnavailable' | 'error.saveFailed' | 'error.detailLoad' | 'error.deleteConfirm' | 'error.deleteSuccess' | 'error.deleteFailed' | 'error.backend.invalidAntiforgeryToken' | 'error.backend.missingWorkbook' | 'error.backend.workbookTooLarge' | 'error.backend.unsupportedWorkbookType' | 'error.backend.invalidWorkbook' | 'error.backend.missingWorksheet' | 'error.backend.invalidMCodeColumn' | 'error.backend.workbookRowLimitExceeded' | 'error.backend.invalidPagination' | 'error.backend.invalidQueryParameter' | 'error.backend.invalidQueryValue' | 'error.backend.recordVersionConflict' | 'error.backend.duplicateMCode' | 'error.badRequest' | 'error.unauthorized' | 'error.notFound' | 'error.conflict' | 'error.rateLimited' | 'notice.saved' | 'app.catalogEyebrow' | 'app.title' | 'app.subtitle' | 'app.navigation' | 'app.catalogTab' | 'app.importTab' | 'app.createRecord' | 'app.createFirst' | 'app.logout' | 'app.logoutBusy' | 'app.footer' | 'form.editEyebrow' | 'form.newEyebrow' | 'form.title' | 'form.close' | 'form.hint' | 'form.cancel' | 'form.saving' | 'form.saveChanges' | 'form.save' | 'field.date' | 'field.companyName' | 'field.itemName' | 'field.mCode' | 'field.itemCode' | 'field.productType' | 'field.productStatus' | 'field.approvalStatus' | 'field.sampleOrProductionOrder' | 'field.companyNameLetters' | 'field.oldRegion' | 'field.sampleSavedDate' | 'field.picImage' | 'field.purchaseOrder' | 'field.productionOrderPdf' | 'field.note' | 'field.printedAt' | 'field.discName' | 'field.soi' | 'field.maso' | 'field.denier' | 'field.price' | 'field.region' | 'field.quantity' | 'field.picUrl' | 'field.internalItem' | 'field.request' | 'import.eyebrow' | 'import.title' | 'import.hint' | 'import.selectFile' | 'import.checking' | 'import.showSheets' | 'import.worksheet' | 'import.reading' | 'import.firstRows' | 'import.noHeaders' | 'import.rawRowsCaption' | 'import.excelRow' | 'import.formulaHidden' | 'import.formulaNote' | 'import.noRowsAfterHeader' | 'import.noRowsForMapping' | 'import.headersTitle' | 'import.headersRecognized' | 'import.column' | 'import.columnFallback' | 'import.blank' | 'import.recognized' | 'import.duplicate' | 'import.blankHeader' | 'import.unrecognized' | 'import.missingHeaders' | 'import.headersNote' | 'import.mappingTitle' | 'import.mappingHint' | 'import.mappingNone' | 'import.mappingCount' | 'import.mappingFieldLabel' | 'import.noMapping' | 'import.mappingSampleHint' | 'import.mappedPreviewTitle' | 'import.mappedPreviewCaption' | 'import.rowPreviewTitle' | 'import.validateMCode' | 'import.validatingMCode' | 'import.validationSummary' | 'import.duplicateAtRow' | 'import.validationNote' | 'import.commitTitle' | 'import.commitSummary' | 'import.commitFile' | 'import.commitReplay' | 'import.commitAction' | 'import.commitBusy' | 'import.confirmCommit' | 'import.mappingRequired' | 'import.historyTitle' | 'import.historyRefresh' | 'import.historyRefreshing' | 'import.historyLoading' | 'import.historyEmpty' | 'import.historyPermissionHint' | 'import.historySelect' | 'import.historyDetail' | 'import.unknownIssue' | 'error.backend.invalidColumnMapping' | 'error.backend.importCommitConflict' | 'error.backend.importDuplicateConflict' | 'error.backend.invalidPageSize' | 'catalog.title' | 'catalog.detailBack' | 'catalog.detailLoading' | 'catalog.noCompanyName' | 'catalog.noItemName' | 'catalog.noPicImage' | 'catalog.itemCount' | 'catalog.totalCount' | 'catalog.loading' | 'catalog.page' | 'catalog.searchLabel' | 'catalog.searchPlaceholder' | 'catalog.filter' | 'catalog.search' | 'catalog.searchHint' | 'catalog.clearFilters' | 'catalog.applyFilters' | 'catalog.edit' | 'catalog.delete' | 'catalog.audit' | 'catalog.hideAudit' | 'catalog.showAudit' | 'catalog.noMatches' | 'catalog.emptyTitle' | 'catalog.emptySearch' | 'catalog.emptyCatalog' | 'catalog.clearSearch' | 'catalog.loadingRecords' | 'catalog.showing' | 'catalog.previous' | 'catalog.next' | 'audit.eyebrow' | 'audit.title' | 'audit.close' | 'audit.permission' | 'audit.noPermission' | 'audit.invalidResponse' | 'audit.loading' | 'audit.empty' | 'audit.actionCreated' | 'audit.actionUpdated' | 'audit.actionDeleted' | 'audit.succeeded' | 'audit.failed' | 'audit.actor' | 'audit.system' | 'audit.correlation' | 'audit.target' | 'audit.metadata'
export type Translate = (key: MessageKey, values?: MessageValues) => string

export const locales = ['vi', 'en', 'ko'] as const
export const localeNames: Record<Locale, string> = { vi: 'Tiếng Việt', en: 'English', ko: '한국어' }
const intlLocale: Record<Locale, string> = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR' }
const backendErrorMessageKeys: Record<string, MessageKey> = {
  invalid_antiforgery_token: 'error.backend.invalidAntiforgeryToken',
  missing_workbook: 'error.backend.missingWorkbook',
  workbook_too_large: 'error.backend.workbookTooLarge',
  unsupported_workbook_type: 'error.backend.unsupportedWorkbookType',
  invalid_workbook: 'error.backend.invalidWorkbook',
  missing_worksheet: 'error.backend.missingWorksheet',
  invalid_m_code_column: 'error.backend.invalidMCodeColumn',
  workbook_row_limit_exceeded: 'error.backend.workbookRowLimitExceeded',
  invalid_pagination: 'error.backend.invalidPagination',
  invalid_query_parameter: 'error.backend.invalidQueryParameter',
  invalid_query_value: 'error.backend.invalidQueryValue',
  record_version_conflict: 'error.backend.recordVersionConflict',
  duplicate_m_code: 'error.backend.duplicateMCode',
  invalid_column_mapping: 'error.backend.invalidColumnMapping',
  import_commit_conflict: 'error.backend.importCommitConflict',
  import_duplicate_conflict: 'error.backend.importDuplicateConflict',
  invalid_page_size: 'error.backend.invalidPageSize',
}

export function getBackendErrorMessageKey(code: unknown): MessageKey | undefined {
  return typeof code === 'string' ? backendErrorMessageKeys[code] : undefined
}

export function getLocalePreference(value: string | null): Locale {
  return value === 'vi' || value === 'en' || value === 'ko' ? value : 'vi'
}

export function getThemePreference(value: string | null, systemPrefersDark: boolean): Theme {
  if (value === 'light' || value === 'dark') return value
  return systemPrefersDark ? 'dark' : 'light'
}

export async function loadTranslations(locale: Locale): Promise<Record<MessageKey, string>> {
  const response = await fetch(`/api/v1/localization/${locale}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Localization request failed (HTTP ${response.status}).`)
  return await response.json() as Record<MessageKey, string>
}

export function translate(translations: Partial<Record<MessageKey, string>>, key: MessageKey, values: MessageValues = {}): string {
  return (translations[key] ?? key).replace(/\{([\w]+)\}/g, (match, name: string) => Object.hasOwn(values, name) ? String(values[name]) : match)
}

export function formatLocaleNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(intlLocale[locale]).format(value)
}

export function formatLocaleDate(locale: Locale, value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: 'medium' }).format(date)
}

export function formatLocaleDateTime(locale: Locale, value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
