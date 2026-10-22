export type Locale = 'vi' | 'en' | 'ko'
export type Theme = 'light' | 'dark'
export type MessageValues = Record<string, string | number>

const vi = {
  'prefs.language': 'Ngôn ngữ',
  'prefs.group': 'Ngôn ngữ và giao diện',
  'prefs.switchToDark': 'Chuyển sang giao diện tối',
  'prefs.switchToLight': 'Chuyển sang giao diện sáng',
  'prefs.light': 'Sáng',
  'prefs.dark': 'Tối',
  'brand.workspace': 'KHÔNG GIAN DANH MỤC',
  'brand.catalogLabel': 'Product Master Data — danh mục sản phẩm',
  'login.storyEyebrow': 'DỮ LIỆU SẢN PHẨM · 27 TRƯỜNG NGUỒN',
  'login.storyTitle': 'Mọi thông tin sản phẩm, ở đúng một nơi.',
  'login.storyDescription': 'Tìm kiếm trên mọi trường, quản lý hồ sơ và xem trước workbook Excel trong cùng một không gian.',
  'login.sourceFields': '27 trường dữ liệu nguồn',
  'login.catalogManaged': 'Quản lý danh mục tập trung',
  'login.internal': 'KHU VỰC NỘI BỘ',
  'login.title': 'Đăng nhập',
  'login.copy': 'Dùng thông tin đăng nhập để truy cập không gian dữ liệu.',
  'login.username': 'Tên đăng nhập',
  'login.password': 'Mật khẩu',
  'login.busy': 'Đang đăng nhập…',
  'login.submit': 'Đăng nhập',
  'login.footnote': 'Quyền truy cập được cấp bởi quản trị viên tổ chức.',
  'error.csrfInit': 'Không thể khởi tạo phiên bảo mật. Vui lòng thử lại.',
  'error.csrfToken': 'Không nhận được mã bảo mật từ máy chủ.',
  'error.forbidden': 'Tài khoản không có quyền thực hiện thao tác này.',
  'error.httpStatus': 'Yêu cầu thất bại (HTTP {status}).',
  'error.sessionUnavailable': 'Không thể kiểm tra phiên đăng nhập.',
  'error.connection': 'Không thể kết nối máy chủ. Hãy kiểm tra API đã được khởi động chưa.',
  'error.catalogLoad': 'Không thể tải danh mục sản phẩm.',
  'error.importPick': 'Vui lòng chọn tệp .xlsx để xem trước.',
  'error.importRead': 'Không thể đọc tệp Excel.',
  'error.worksheetRequired': 'Chọn một worksheet trước khi xem dòng mẫu.',
  'error.auditLoad': 'Không thể tải lịch sử kiểm toán.',
  'error.loginFailed': 'Đăng nhập không thành công. Hãy kiểm tra tên đăng nhập và mật khẩu.',
  'error.loginSession': 'Đã tạo phiên nhưng không tải được hồ sơ người dùng.',
  'error.loginUnavailable': 'Không thể đăng nhập.',
  'error.logoutUnavailable': 'Không thể đăng xuất.',
  'error.saveFailed': 'Không thể lưu hồ sơ sản phẩm.',
  'error.editLoad': 'Không thể tải hồ sơ để chỉnh sửa.',
  'error.deleteConfirm': 'Xóa mềm hồ sơ {record}? Hồ sơ sẽ được giữ lại trong lịch sử.',
  'error.deleteSuccess': 'Đã chuyển hồ sơ vào trạng thái đã xóa mềm.',
  'error.deleteFailed': 'Không thể xóa hồ sơ.',
  'error.backend.invalidAntiforgeryToken': 'Phiên bảo mật đã hết hạn hoặc không hợp lệ. Hãy tải lại trang rồi thử lại.',
  'error.backend.missingWorkbook': 'Hãy chọn một tệp Excel .xlsx không rỗng.',
  'error.backend.workbookTooLarge': 'Tệp Excel vượt quá giới hạn 10 MiB.',
  'error.backend.unsupportedWorkbookType': 'Chỉ hỗ trợ tệp Excel định dạng .xlsx.',
  'error.backend.invalidWorkbook': 'Tệp Excel không hợp lệ hoặc không thể đọc.',
  'error.backend.invalidPagination': 'Thông số trang không hợp lệ. Hãy tải lại danh mục rồi thử lại.',
  'error.backend.invalidQueryParameter': 'Có trường tìm kiếm hoặc bộ lọc không được hỗ trợ. Hãy xóa bộ lọc và thử lại.',
  'error.backend.invalidQueryValue': 'Mỗi trường tìm kiếm hoặc bộ lọc chỉ được gửi một giá trị.',
  'error.backend.recordVersionConflict': 'Hồ sơ đã được thay đổi. Hãy tải lại hồ sơ trước khi lưu hoặc xóa.',
  'error.backend.duplicateMCode': 'M.CODE này đã được sử dụng cho một hồ sơ khác.',
  'error.badRequest': 'Yêu cầu không hợp lệ. Hãy kiểm tra dữ liệu và thử lại.',
  'error.unauthorized': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại.',
  'error.notFound': 'Không tìm thấy dữ liệu được yêu cầu.',
  'error.conflict': 'Dữ liệu đang xung đột với trạng thái hiện tại. Hãy tải lại rồi thử lại.',
  'error.rateLimited': 'Bạn đã gửi quá nhiều yêu cầu. Hãy chờ một chút rồi thử lại.',
  'notice.saved': 'Đã lưu hồ sơ sản phẩm.',
  'app.catalogEyebrow': 'DANH MỤC · MASTER DATA',
  'app.title': 'Hồ sơ sản phẩm',
  'app.subtitle': 'Danh sách tập trung và các giá trị gốc của dữ liệu sản phẩm.',
  'app.createRecord': 'Tạo hồ sơ',
  'app.createFirst': 'Tạo hồ sơ đầu tiên',
  'app.logout': 'Đăng xuất',
  'app.logoutBusy': 'Đang đăng xuất…',
  'app.footer': 'Danh mục nội bộ của tổ chức',
  'form.editEyebrow': 'CHỈNH SỬA HỒ SƠ',
  'form.newEyebrow': 'HỒ SƠ MỚI',
  'form.title': 'Thông tin sản phẩm',
  'form.close': 'Đóng',
  'form.hint': 'Tất cả trường đều không bắt buộc. Giá trị được lưu dưới dạng văn bản; M.CODE phải duy nhất nếu được nhập. Khi chỉnh sửa, các trường để trống sẽ được lưu là rỗng.',
  'form.cancel': 'Hủy',
  'form.saving': 'Đang lưu…',
  'form.saveChanges': 'Lưu thay đổi',
  'form.save': 'Lưu hồ sơ',
  'field.date': 'Ngày',
  'field.companyName': 'Tên công ty',
  'field.itemName': 'Tên sản phẩm',
  'field.mCode': 'M.CODE',
  'field.itemCode': 'Mã hàng',
  'field.productType': 'Loại sản phẩm',
  'field.productStatus': 'Trạng thái sản phẩm',
  'field.approvalStatus': 'Trạng thái phê duyệt',
  'field.sampleOrProductionOrder': 'Đơn mẫu / đơn sản xuất',
  'field.companyNameLetters': 'Tên công ty (chữ cái)',
  'field.oldRegion': 'Vùng cũ',
  'field.sampleSavedDate': 'Ngày lưu mẫu',
  'field.picImage': 'Ảnh PIC',
  'field.purchaseOrder': 'Đơn đặt hàng',
  'field.productionOrderPdf': 'PDF đơn sản xuất',
  'field.note': 'Ghi chú',
  'field.printedAt': 'Thời gian in',
  'field.discName': 'Tên đĩa',
  'field.soi': 'SOI',
  'field.maso': 'Mã số',
  'field.denier': 'Denier',
  'field.price': 'Giá',
  'field.region': 'Khu vực',
  'field.quantity': 'Số lượng',
  'field.picUrl': 'URL PIC',
  'field.internalItem': 'Mặt hàng nội bộ',
  'field.request': 'Yêu cầu',
  'import.eyebrow': 'NHẬP DỮ LIỆU · BƯỚC 1',
  'import.title': 'Kiểm tra tệp Excel',
  'import.hint': 'Tải tệp .xlsx để xem tên sheet, tiêu đề cột và tối đa 10 dòng mẫu trong sheet đã chọn. Ô công thức được ẩn; bước này chưa xác thực hoặc nhập hồ sơ.',
  'import.selectFile': 'Chọn tệp Excel .xlsx',
  'import.checking': 'Đang kiểm tra…',
  'import.showSheets': 'Xem sheet và tiêu đề',
  'import.worksheet': 'Worksheet cần xem',
  'import.reading': 'Đang đọc…',
  'import.firstRows': 'Xem 10 dòng đầu',
  'import.noHeaders': 'Không tìm thấy tiêu đề ở hàng đầu tiên.',
  'import.rawRowsCaption': 'Tối đa 10 dòng dữ liệu thô từ worksheet đã chọn',
  'import.excelRow': 'Dòng Excel',
  'import.formulaHidden': 'Công thức bị ẩn',
  'import.formulaNote': 'Giá trị công thức và kết quả lưu sẵn không được hiển thị hoặc đánh giá.',
  'import.noRowsAfterHeader': 'Worksheet không có dòng dữ liệu mẫu sau hàng tiêu đề.',
  'import.noRowsForMapping': 'Worksheet không có dòng dữ liệu mẫu để xem theo ánh xạ.',
  'import.headersTitle': 'Đối chiếu tiêu đề cột',
  'import.headersRecognized': '{recognized}/{total} tiêu đề nguồn được nhận diện chính xác.',
  'import.column': 'Cột {number}: {header}',
  'import.columnFallback': 'Cột {number}',
  'import.blank': '(trống)',
  'import.recognized': 'Đã nhận diện',
  'import.duplicate': 'Trùng tiêu đề',
  'import.blankHeader': 'Tiêu đề trống',
  'import.unrecognized': 'Chưa nhận diện',
  'import.missingHeaders': 'Thiếu {count} tiêu đề nguồn',
  'import.headersNote': 'Các tiêu đề được nhận diện chưa tự ánh xạ vào trường dữ liệu. Chưa có xác thực hoặc nhập hồ sơ.',
  'import.mappingTitle': 'Ánh xạ cột tạm thời',
  'import.mappingHint': 'Chọn trường đích cho từng cột; không có lựa chọn nào được điền sẵn. Mỗi trường chỉ ánh xạ với một cột. Lựa chọn chỉ được lưu tạm trong màn hình này, chưa gửi hoặc nhập dữ liệu.',
  'import.mappingNone': 'Chưa ánh xạ cột nào.',
  'import.mappingCount': '{count} cột được ánh xạ tạm thời.',
  'import.mappingFieldLabel': 'Cột {number}: {header} → trường hồ sơ',
  'import.noMapping': 'Không ánh xạ',
  'import.mappingSampleHint': 'Xem tối đa 10 dòng đầu để kiểm tra dữ liệu theo ánh xạ.',
  'import.mappedPreviewTitle': 'Dữ liệu theo ánh xạ (chưa xác thực hoặc nhập)',
  'import.mappedPreviewCaption': 'Tối đa 10 dòng mẫu, sắp theo trường đích đã chọn; không được xác thực hoặc nhập',
  'import.rowPreviewTitle': 'Dòng mẫu — {sheet}',
  'catalog.title': 'Tất cả hồ sơ',
  'catalog.totalCount': '{count} hồ sơ',
  'catalog.loading': 'Đang tải danh mục…',
  'catalog.page': 'Trang {page}/{total}',
  'catalog.searchLabel': 'Tìm kiếm trên tất cả trường dữ liệu',
  'catalog.searchPlaceholder': 'Tìm trong 27 trường dữ liệu…',
  'catalog.filter': 'Bộ lọc',
  'catalog.search': 'Tìm kiếm',
  'catalog.searchHint': 'Tìm kiếm không phân biệt hoa/thường; có thể lọc riêng từng trường.',
  'catalog.clearFilters': 'Xóa bộ lọc',
  'catalog.applyFilters': 'Áp dụng lọc',
  'catalog.tableCaption': 'Danh sách hồ sơ sản phẩm',
  'catalog.columnCompany': 'Công ty',
  'catalog.columnStatus': 'Trạng thái',
  'catalog.columnUpdated': 'Cập nhật',
  'catalog.rowActions': 'Thao tác',
  'catalog.noName': 'Chưa có tên',
  'catalog.noStatus': 'Chưa cập nhật',
  'catalog.edit': 'Sửa',
  'catalog.delete': 'Xóa',
  'catalog.audit': 'Lịch sử',
  'catalog.hideAudit': 'Ẩn',
  'catalog.showAudit': 'Xem',
  'catalog.noMatches': 'Không tìm thấy hồ sơ phù hợp',
  'catalog.emptyTitle': 'Danh mục chưa có dữ liệu',
  'catalog.emptySearch': 'Thử thay đổi từ khóa hoặc bộ lọc để tìm hồ sơ.',
  'catalog.emptyCatalog': 'Tạo hồ sơ đầu tiên để bắt đầu quản lý danh mục sản phẩm.',
  'catalog.clearSearch': 'Xóa tìm kiếm và bộ lọc',
  'catalog.loadingRecords': 'Đang tải hồ sơ…',
  'catalog.showing': 'Đang hiển thị {shown}/{total}',
  'catalog.previous': 'Trước',
  'catalog.next': 'Sau',
  'audit.eyebrow': 'LỊCH SỬ HỒ SƠ',
  'audit.title': 'Lịch sử kiểm toán — {record}',
  'audit.close': 'Đóng lịch sử kiểm toán',
  'audit.permission': 'API kiểm tra quyền audit.read; quyền truy cập không được suy đoán ở giao diện.',
  'audit.noPermission': 'Tài khoản không có quyền xem lịch sử kiểm toán (audit.read).',

  'audit.invalidResponse': 'Phản hồi lịch sử kiểm toán không đúng định dạng.',
  'audit.loading': 'Đang tải lịch sử kiểm toán…',
  'audit.empty': 'Chưa có sự kiện kiểm toán cho hồ sơ này.',
  'audit.actionCreated': 'Tạo hồ sơ',
  'audit.actionUpdated': 'Cập nhật hồ sơ',
  'audit.actionDeleted': 'Xóa mềm hồ sơ',
  'audit.succeeded': 'Thành công',
  'audit.failed': 'Thất bại',
  'audit.actor': 'Người thực hiện',
  'audit.system': 'Hệ thống',
  'audit.correlation': 'Mã tương quan',
  'audit.target': 'Đối tượng',
  'audit.metadata': 'Metadata an toàn',
} as const

type MessageKey = keyof typeof vi

const en: Record<MessageKey, string> = {
  'prefs.language': 'Language',
  'prefs.group': 'Language and appearance', 'prefs.switchToDark': 'Switch to dark theme', 'prefs.switchToLight': 'Switch to light theme', 'prefs.light': 'Light', 'prefs.dark': 'Dark',
  'brand.workspace': 'CATALOG WORKSPACE', 'brand.catalogLabel': 'Product Master Data — product catalog',
  'login.storyEyebrow': 'PRODUCT DATA · 27 SOURCE FIELDS', 'login.storyTitle': 'Every product detail, in one place.', 'login.storyDescription': 'Search every field, manage records, and preview Excel workbooks in one workspace.', 'login.sourceFields': '27 source data fields', 'login.catalogManaged': 'Centralized catalog management', 'login.internal': 'INTERNAL WORKSPACE', 'login.title': 'Sign in', 'login.copy': 'Use your account credentials to access the data workspace.', 'login.username': 'Username', 'login.password': 'Password', 'login.busy': 'Signing in…', 'login.submit': 'Sign in', 'login.footnote': 'Access is managed by your organization administrator.',
  'error.csrfInit': 'Could not initialize a secure session. Please try again.', 'error.csrfToken': 'The server did not return a security token.', 'error.forbidden': 'Your account is not allowed to perform this action.', 'error.httpStatus': 'Request failed (HTTP {status}).', 'error.sessionUnavailable': 'Could not verify the signed-in session.', 'error.connection': 'Could not connect to the server. Check that the API is running.', 'error.catalogLoad': 'Could not load the product catalog.', 'error.importPick': 'Select an .xlsx file to preview.', 'error.importRead': 'Could not read the Excel file.', 'error.worksheetRequired': 'Select a worksheet before previewing sample rows.', 'error.auditLoad': 'Could not load audit history.', 'error.loginFailed': 'Sign-in failed. Check your username and password.', 'error.loginSession': 'The session was created, but the user profile could not be loaded.', 'error.loginUnavailable': 'Could not sign in.', 'error.logoutUnavailable': 'Could not sign out.', 'error.saveFailed': 'Could not save the product record.', 'error.editLoad': 'Could not load the record for editing.', 'error.deleteConfirm': 'Soft-delete record {record}? It will remain in the history.', 'error.deleteSuccess': 'The record was moved to the soft-deleted state.', 'error.deleteFailed': 'Could not delete the record.', 'error.backend.invalidAntiforgeryToken': 'The security session expired or is invalid. Reload the page and try again.', 'error.backend.missingWorkbook': 'Choose a non-empty .xlsx workbook.', 'error.backend.workbookTooLarge': 'The workbook exceeds the 10 MiB limit.', 'error.backend.unsupportedWorkbookType': 'Only .xlsx workbooks are supported.', 'error.backend.invalidWorkbook': 'The workbook is invalid or could not be read.', 'error.backend.invalidPagination': 'The page parameters are invalid. Reload the catalog and try again.', 'error.backend.invalidQueryParameter': 'A search or filter field is unsupported. Clear the filters and try again.', 'error.backend.invalidQueryValue': 'Each search or filter field can have only one value.', 'error.backend.recordVersionConflict': 'The record has changed. Reload it before saving or deleting.', 'error.backend.duplicateMCode': 'This M.CODE is already used by another record.', 'error.badRequest': 'The request is invalid. Check the data and try again.', 'error.unauthorized': 'The session is invalid or expired. Sign in again.', 'error.notFound': 'The requested data could not be found.', 'error.conflict': 'The data conflicts with its current state. Reload and try again.', 'error.rateLimited': 'Too many requests. Wait a moment and try again.', 'notice.saved': 'Product record saved.',
  'app.catalogEyebrow': 'CATALOG · MASTER DATA', 'app.title': 'Product records', 'app.subtitle': 'A centralized catalog of product records and their source values.', 'app.createRecord': 'Create record', 'app.createFirst': 'Create the first record', 'app.logout': 'Sign out', 'app.logoutBusy': 'Signing out…', 'app.footer': 'Organization internal catalog',
  'form.editEyebrow': 'EDIT RECORD', 'form.newEyebrow': 'NEW RECORD', 'form.title': 'Product information', 'form.close': 'Close', 'form.hint': 'All fields are optional. Values are stored as text; M.CODE must be unique when provided. When editing, blank fields are saved as empty.', 'form.cancel': 'Cancel', 'form.saving': 'Saving…', 'form.saveChanges': 'Save changes', 'form.save': 'Save record',
  'field.date': 'Date', 'field.companyName': 'Company name', 'field.itemName': 'Item name', 'field.mCode': 'M.CODE', 'field.itemCode': 'Item code', 'field.productType': 'Product type', 'field.productStatus': 'Product status', 'field.approvalStatus': 'Approval status', 'field.sampleOrProductionOrder': 'Sample / production order', 'field.companyNameLetters': 'Company name (letters)', 'field.oldRegion': 'Old region', 'field.sampleSavedDate': 'Sample saved date', 'field.picImage': 'PIC image', 'field.purchaseOrder': 'Purchase order', 'field.productionOrderPdf': 'Production order PDF', 'field.note': 'Note', 'field.printedAt': 'Printed at', 'field.discName': 'Disc name', 'field.soi': 'SOI', 'field.maso': 'Number', 'field.denier': 'Denier', 'field.price': 'Price', 'field.region': 'Region', 'field.quantity': 'Quantity', 'field.picUrl': 'PIC URL', 'field.internalItem': 'Internal item', 'field.request': 'Request',
  'import.eyebrow': 'DATA IMPORT · STEP 1', 'import.title': 'Review Excel workbook', 'import.hint': 'Upload an .xlsx file to inspect sheet names, column headers, and up to 10 sample rows from the selected sheet. Formula cells are hidden; this step does not validate or import records.', 'import.selectFile': 'Choose an .xlsx file', 'import.checking': 'Checking…', 'import.showSheets': 'Review sheets and headers', 'import.worksheet': 'Worksheet to preview', 'import.reading': 'Reading…', 'import.firstRows': 'Preview first 10 rows', 'import.noHeaders': 'No headers were found in the first row.', 'import.rawRowsCaption': 'Up to 10 raw data rows from the selected worksheet', 'import.excelRow': 'Excel row', 'import.formulaHidden': 'Formula hidden', 'import.formulaNote': 'Formula values and cached results are not displayed or evaluated.', 'import.noRowsAfterHeader': 'The worksheet has no sample data rows after the header.', 'import.noRowsForMapping': 'The worksheet has no sample data rows to preview with this mapping.', 'import.headersTitle': 'Column header diagnostics', 'import.headersRecognized': '{recognized}/{total} source headers recognized exactly.', 'import.column': 'Column {number}: {header}', 'import.columnFallback': 'Column {number}', 'import.blank': '(blank)', 'import.recognized': 'Recognized', 'import.duplicate': 'Duplicate header', 'import.blankHeader': 'Blank header', 'import.unrecognized': 'Unrecognized', 'import.missingHeaders': '{count} source headers missing', 'import.headersNote': 'Recognized headers are not automatically mapped to data fields. No validation or record import occurs.', 'import.mappingTitle': 'Temporary column mapping', 'import.mappingHint': 'Choose a target field for each column; nothing is preselected. Each field can map to one column. Choices are temporary on this screen and do not submit or import data.', 'import.mappingNone': 'No columns mapped.', 'import.mappingCount': '{count} columns temporarily mapped.', 'import.mappingFieldLabel': 'Column {number}: {header} → record field', 'import.noMapping': 'Do not map', 'import.mappingSampleHint': 'Preview up to the first 10 rows using this mapping.', 'import.mappedPreviewTitle': 'Mapped data (not validated or imported)', 'import.mappedPreviewCaption': 'Up to 10 sample rows, ordered by selected target field; not validated or imported', 'import.rowPreviewTitle': 'Sample rows — {sheet}',
  'catalog.title': 'All records', 'catalog.totalCount': '{count} records', 'catalog.loading': 'Loading catalog…', 'catalog.page': 'Page {page}/{total}', 'catalog.searchLabel': 'Search all data fields', 'catalog.searchPlaceholder': 'Search across 27 data fields…', 'catalog.filter': 'Filters', 'catalog.search': 'Search', 'catalog.searchHint': 'Search is case-insensitive; each field can also be filtered separately.', 'catalog.clearFilters': 'Clear filters', 'catalog.applyFilters': 'Apply filters', 'catalog.tableCaption': 'Product record list', 'catalog.columnCompany': 'Company', 'catalog.columnStatus': 'Status', 'catalog.columnUpdated': 'Updated', 'catalog.rowActions': 'Actions', 'catalog.noName': 'Unnamed', 'catalog.noStatus': 'Not updated', 'catalog.edit': 'Edit', 'catalog.delete': 'Delete', 'catalog.audit': 'History', 'catalog.hideAudit': 'Hide', 'catalog.showAudit': 'View', 'catalog.noMatches': 'No matching records found', 'catalog.emptyTitle': 'Your catalog is empty', 'catalog.emptySearch': 'Try changing your search term or filters.', 'catalog.emptyCatalog': 'Create your first record to start managing the product catalog.', 'catalog.clearSearch': 'Clear search and filters', 'catalog.loadingRecords': 'Loading records…', 'catalog.showing': 'Showing {shown}/{total}', 'catalog.previous': 'Previous', 'catalog.next': 'Next',
  'audit.eyebrow': 'RECORD HISTORY', 'audit.title': 'Audit history — {record}', 'audit.close': 'Close audit history', 'audit.permission': 'The API checks the audit.read permission; access is not assumed by the UI.', 'audit.loading': 'Loading audit history…', 'audit.empty': 'There are no audit events for this record.', 'audit.actionCreated': 'Record created', 'audit.actionUpdated': 'Record updated', 'audit.actionDeleted': 'Record soft-deleted', 'audit.succeeded': 'Succeeded', 'audit.failed': 'Failed', 'audit.actor': 'Actor', 'audit.system': 'System', 'audit.correlation': 'Correlation ID', 'audit.target': 'Target', 'audit.metadata': 'Safe metadata',
  'audit.noPermission': 'Your account does not have the audit.read permission.', 'audit.invalidResponse': 'The audit history response has an invalid format.',
}

const ko: Record<MessageKey, string> = {
  'prefs.language': '언어', 'prefs.group': '언어 및 화면 설정', 'prefs.switchToDark': '다크 테마로 전환', 'prefs.switchToLight': '라이트 테마로 전환', 'prefs.light': '라이트', 'prefs.dark': '다크',
  'brand.workspace': '제품 카탈로그 작업 공간', 'brand.catalogLabel': 'Product Master Data — 제품 카탈로그',
  'login.storyEyebrow': '제품 데이터 · 원본 필드 27개', 'login.storyTitle': '모든 제품 정보를 한곳에서 관리하세요.', 'login.storyDescription': '모든 필드 검색, 레코드 관리, Excel 통합 문서 미리보기를 한 작업 공간에서 이용할 수 있습니다.', 'login.sourceFields': '원본 데이터 필드 27개', 'login.catalogManaged': '중앙 집중식 카탈로그 관리', 'login.internal': '내부 작업 공간', 'login.title': '로그인', 'login.copy': '계정 정보로 데이터 작업 공간에 접속하세요.', 'login.username': '사용자 이름', 'login.password': '비밀번호', 'login.busy': '로그인 중…', 'login.submit': '로그인', 'login.footnote': '접근 권한은 조직 관리자가 부여합니다.',
  'error.csrfInit': '보안 세션을 시작할 수 없습니다. 다시 시도해 주세요.', 'error.csrfToken': '서버에서 보안 토큰을 받지 못했습니다.', 'error.forbidden': '이 작업을 수행할 권한이 없습니다.', 'error.httpStatus': '요청 실패 (HTTP {status}).', 'error.sessionUnavailable': '로그인 세션을 확인할 수 없습니다.', 'error.connection': '서버에 연결할 수 없습니다. API가 실행 중인지 확인해 주세요.', 'error.catalogLoad': '제품 카탈로그를 불러올 수 없습니다.', 'error.importPick': '미리 볼 .xlsx 파일을 선택해 주세요.', 'error.importRead': 'Excel 파일을 읽을 수 없습니다.', 'error.worksheetRequired': '샘플 행을 미리 보려면 워크시트를 선택하세요.', 'error.auditLoad': '감사 기록을 불러올 수 없습니다.', 'error.loginFailed': '로그인에 실패했습니다. 사용자 이름과 비밀번호를 확인하세요.', 'error.loginSession': '세션은 생성되었지만 사용자 프로필을 불러오지 못했습니다.', 'error.loginUnavailable': '로그인할 수 없습니다.', 'error.logoutUnavailable': '로그아웃할 수 없습니다.', 'error.saveFailed': '제품 레코드를 저장할 수 없습니다.', 'error.editLoad': '편집할 레코드를 불러올 수 없습니다.', 'error.deleteConfirm': '레코드 {record}을(를) 소프트 삭제할까요? 기록은 보존됩니다.', 'error.deleteSuccess': '레코드가 소프트 삭제 상태로 변경되었습니다.', 'error.deleteFailed': '레코드를 삭제할 수 없습니다.', 'error.backend.invalidAntiforgeryToken': '보안 세션이 만료되었거나 유효하지 않습니다. 페이지를 새로고침하고 다시 시도하세요.', 'error.backend.missingWorkbook': '비어 있지 않은 .xlsx 통합 문서를 선택하세요.', 'error.backend.workbookTooLarge': '통합 문서가 10MiB 제한을 초과했습니다.', 'error.backend.unsupportedWorkbookType': '.xlsx 형식만 지원합니다.', 'error.backend.invalidWorkbook': '통합 문서가 유효하지 않거나 읽을 수 없습니다.', 'error.backend.invalidPagination': '페이지 매개변수가 유효하지 않습니다. 카탈로그를 새로고침하고 다시 시도하세요.', 'error.backend.invalidQueryParameter': '지원되지 않는 검색 또는 필터 필드입니다. 필터를 지우고 다시 시도하세요.', 'error.backend.invalidQueryValue': '각 검색 또는 필터 필드에는 하나의 값만 지정할 수 있습니다.', 'error.backend.recordVersionConflict': '레코드가 변경되었습니다. 저장하거나 삭제하기 전에 다시 불러오세요.', 'error.backend.duplicateMCode': '이 M.CODE는 다른 레코드에서 이미 사용 중입니다.', 'error.badRequest': '요청이 유효하지 않습니다. 데이터를 확인하고 다시 시도하세요.', 'error.unauthorized': '로그인 세션이 유효하지 않거나 만료되었습니다. 다시 로그인하세요.', 'error.notFound': '요청한 데이터를 찾을 수 없습니다.', 'error.conflict': '현재 데이터 상태와 충돌합니다. 다시 불러온 후 시도하세요.', 'error.rateLimited': '요청이 너무 많습니다. 잠시 후 다시 시도하세요.', 'notice.saved': '제품 레코드가 저장되었습니다.',
  'app.catalogEyebrow': '카탈로그 · 마스터 데이터', 'app.title': '제품 레코드', 'app.subtitle': '제품 레코드와 원본 값을 한곳에서 관리하는 카탈로그입니다.', 'app.createRecord': '레코드 만들기', 'app.createFirst': '첫 레코드 만들기', 'app.logout': '로그아웃', 'app.logoutBusy': '로그아웃 중…', 'app.footer': '조직 내부 카탈로그',
  'form.editEyebrow': '레코드 편집', 'form.newEyebrow': '새 레코드', 'form.title': '제품 정보', 'form.close': '닫기', 'form.hint': '모든 필드는 선택 사항입니다. 값은 텍스트로 저장되며 입력한 경우 M.CODE는 고유해야 합니다. 편집 시 비워 둔 필드는 빈 값으로 저장됩니다.', 'form.cancel': '취소', 'form.saving': '저장 중…', 'form.saveChanges': '변경 사항 저장', 'form.save': '레코드 저장',
  'field.date': '날짜', 'field.companyName': '회사명', 'field.itemName': '제품명', 'field.mCode': 'M.CODE', 'field.itemCode': '품목 코드', 'field.productType': '제품 유형', 'field.productStatus': '제품 상태', 'field.approvalStatus': '승인 상태', 'field.sampleOrProductionOrder': '샘플 / 생산 주문', 'field.companyNameLetters': '회사명 (문자)', 'field.oldRegion': '이전 지역', 'field.sampleSavedDate': '샘플 저장일', 'field.picImage': '담당자 이미지', 'field.purchaseOrder': '구매 주문', 'field.productionOrderPdf': '생산 주문 PDF', 'field.note': '메모', 'field.printedAt': '출력 시각', 'field.discName': '디스크 이름', 'field.soi': 'SOI', 'field.maso': '번호', 'field.denier': 'Denier', 'field.price': '가격', 'field.region': '지역', 'field.quantity': '수량', 'field.picUrl': '담당자 URL', 'field.internalItem': '내부 품목', 'field.request': '요청',
  'import.eyebrow': '데이터 가져오기 · 1단계', 'import.title': 'Excel 파일 확인', 'import.hint': '.xlsx 파일을 올려 시트 이름, 열 제목, 선택한 시트의 샘플 행 최대 10개를 확인하세요. 수식 셀은 숨겨지며, 이 단계에서는 레코드를 검증하거나 가져오지 않습니다.', 'import.selectFile': '.xlsx 파일 선택', 'import.checking': '확인 중…', 'import.showSheets': '시트 및 제목 확인', 'import.worksheet': '미리 볼 워크시트', 'import.reading': '읽는 중…', 'import.firstRows': '처음 10개 행 미리보기', 'import.noHeaders': '첫 번째 행에서 제목을 찾지 못했습니다.', 'import.rawRowsCaption': '선택한 워크시트의 원본 데이터 행 최대 10개', 'import.excelRow': 'Excel 행', 'import.formulaHidden': '수식 숨김', 'import.formulaNote': '수식 값과 저장된 계산 결과는 표시하거나 평가하지 않습니다.', 'import.noRowsAfterHeader': '제목 행 뒤에 샘플 데이터가 없습니다.', 'import.noRowsForMapping': '이 매핑으로 미리 볼 샘플 데이터가 없습니다.', 'import.headersTitle': '열 제목 진단', 'import.headersRecognized': '원본 제목 {total}개 중 {recognized}개를 정확히 인식했습니다.', 'import.column': '{number}열: {header}', 'import.columnFallback': '{number}열', 'import.blank': '(비어 있음)', 'import.recognized': '인식됨', 'import.duplicate': '중복 제목', 'import.blankHeader': '빈 제목', 'import.unrecognized': '인식되지 않음', 'import.missingHeaders': '누락된 원본 제목 {count}개', 'import.headersNote': '인식된 제목은 데이터 필드에 자동 매핑되지 않습니다. 검증이나 레코드 가져오기는 수행되지 않습니다.', 'import.mappingTitle': '임시 열 매핑', 'import.mappingHint': '각 열의 대상 필드를 선택하세요. 기본 선택은 없습니다. 각 필드는 하나의 열에만 매핑할 수 있습니다. 선택은 이 화면에만 임시 저장되며 데이터를 전송하거나 가져오지 않습니다.', 'import.mappingNone': '매핑된 열이 없습니다.', 'import.mappingCount': '열 {count}개가 임시 매핑되었습니다.', 'import.mappingFieldLabel': '{number}열: {header} → 레코드 필드', 'import.noMapping': '매핑 안 함', 'import.mappingSampleHint': '이 매핑으로 처음 10개 행까지 미리 볼 수 있습니다.', 'import.mappedPreviewTitle': '매핑된 데이터 (검증 또는 가져오기 전)', 'import.mappedPreviewCaption': '선택한 대상 필드 순서의 샘플 행 최대 10개; 검증하거나 가져오지 않음', 'import.rowPreviewTitle': '샘플 행 — {sheet}',
  'catalog.title': '전체 레코드', 'catalog.totalCount': '레코드 {count}개', 'catalog.loading': '카탈로그 불러오는 중…', 'catalog.page': '{page}/{total}페이지', 'catalog.searchLabel': '모든 데이터 필드 검색', 'catalog.searchPlaceholder': '데이터 필드 27개에서 검색…', 'catalog.filter': '필터', 'catalog.search': '검색', 'catalog.searchHint': '대소문자를 구분하지 않으며 각 필드를 따로 필터링할 수 있습니다.', 'catalog.clearFilters': '필터 지우기', 'catalog.applyFilters': '필터 적용', 'catalog.tableCaption': '제품 레코드 목록', 'catalog.columnCompany': '회사', 'catalog.columnStatus': '상태', 'catalog.columnUpdated': '수정일', 'catalog.rowActions': '작업', 'catalog.noName': '이름 없음', 'catalog.noStatus': '업데이트되지 않음', 'catalog.edit': '편집', 'catalog.delete': '삭제', 'catalog.audit': '기록', 'catalog.hideAudit': '숨기기', 'catalog.showAudit': '보기', 'catalog.noMatches': '일치하는 레코드가 없습니다', 'catalog.emptyTitle': '카탈로그가 비어 있습니다', 'catalog.emptySearch': '검색어 또는 필터를 변경해 보세요.', 'catalog.emptyCatalog': '첫 레코드를 만들어 제품 카탈로그 관리를 시작하세요.', 'catalog.clearSearch': '검색 및 필터 지우기', 'catalog.loadingRecords': '레코드 불러오는 중…', 'catalog.showing': '{shown}/{total}개 표시 중', 'catalog.previous': '이전', 'catalog.next': '다음',
  'audit.eyebrow': '레코드 기록', 'audit.title': '감사 기록 — {record}', 'audit.close': '감사 기록 닫기', 'audit.permission': 'API가 audit.read 권한을 확인하며, UI는 접근 권한을 임의로 가정하지 않습니다.', 'audit.loading': '감사 기록 불러오는 중…', 'audit.empty': '이 레코드의 감사 이벤트가 없습니다.', 'audit.actionCreated': '레코드 생성', 'audit.actionUpdated': '레코드 수정', 'audit.actionDeleted': '레코드 소프트 삭제', 'audit.succeeded': '성공', 'audit.failed': '실패', 'audit.actor': '수행자', 'audit.system': '시스템', 'audit.correlation': '상관관계 ID', 'audit.target': '대상', 'audit.metadata': '안전한 메타데이터',
  'audit.noPermission': 'audit.read 권한이 없습니다.', 'audit.invalidResponse': '감사 기록 응답 형식이 올바르지 않습니다.',
}

export type { MessageKey }
export const locales = ['vi', 'en', 'ko'] as const satisfies readonly Locale[]
export const localeNames: Record<Locale, string> = { vi: 'Tiếng Việt', en: 'English', ko: '한국어' }
export const messageKeys = Object.keys(vi) as MessageKey[]
const catalogs: Record<Locale, Record<MessageKey, string>> = { vi, en, ko }
const intlLocale: Record<Locale, string> = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR' }
const backendErrorMessageKeys = {
  invalid_antiforgery_token: 'error.backend.invalidAntiforgeryToken',
  missing_workbook: 'error.backend.missingWorkbook',
  workbook_too_large: 'error.backend.workbookTooLarge',
  unsupported_workbook_type: 'error.backend.unsupportedWorkbookType',
  invalid_workbook: 'error.backend.invalidWorkbook',
  invalid_pagination: 'error.backend.invalidPagination',
  invalid_query_parameter: 'error.backend.invalidQueryParameter',
  invalid_query_value: 'error.backend.invalidQueryValue',
  record_version_conflict: 'error.backend.recordVersionConflict',
  duplicate_m_code: 'error.backend.duplicateMCode',
} as const satisfies Record<string, MessageKey>

export function getBackendErrorMessageKey(code: unknown): MessageKey | undefined {
  if (typeof code !== 'string' || !Object.hasOwn(backendErrorMessageKeys, code)) return undefined
  return backendErrorMessageKeys[code as keyof typeof backendErrorMessageKeys]
}

export type Translate = (key: MessageKey, values?: MessageValues) => string

export function translate(locale: Locale, key: MessageKey, values: MessageValues = {}): string {
  return catalogs[locale][key].replace(/\{([\w]+)\}/g, (match, name: string) => (
    Object.hasOwn(values, name) ? String(values[name]) : match
  ))
}

export function getLocalePreference(value: string | null): Locale {
  return value === 'vi' || value === 'en' || value === 'ko' ? value : 'vi'
}

export function getThemePreference(value: string | null, systemPrefersDark: boolean): Theme {
  if (value === 'light' || value === 'dark') return value
  return systemPrefersDark ? 'dark' : 'light'
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
