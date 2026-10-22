export type ImportHeaderDiagnostic = {
  columnNumber: number
  header: string | null
  recognized: boolean
  duplicate: boolean
  blank: boolean
}

export type ImportHeaderAnalysis = {
  columns: ImportHeaderDiagnostic[]
  missingHeaders: string[]
  unrecognizedColumns: { columnNumber: number; header: string }[]
}

const importSourceHeaders = [
  'Date',
  'Tên Công Ty',
  'Item Name',
  'M.CODE',
  'Item Code',
  'Product Type',
  'Status SP',
  'KH Duyệt',
  'Lệnh Sample/SX',
  'Tên Công Ty Chữ Cái',
  'Khu vực cũ',
  'Ngày lưu mẫu',
  'PIC (Hình)',
  'PO',
  'Lệnh SX (PDF)',
  'Note',
  'Đã In (Ngày giờ)',
  'Tên Đĩa',
  'SOI (실)',
  'MASO (실넘버)',
  'DENIER',
  'Giá',
  'Khu vực',
  'Số Lượng',
  'PIC URL (text)',
  'Internal Item',
  'Request',
] as const
export const importSourceHeaderCount = importSourceHeaders.length

export function analyzeImportHeaders(headers: readonly (string | null)[]): ImportHeaderAnalysis {
  const knownHeaders = new Set<string>(importSourceHeaders)
  const counts = new Map<string, number>()
  for (const header of headers) {
    if (header !== null && header !== '') counts.set(header, (counts.get(header) ?? 0) + 1)
  }

  const presentKnownHeaders = new Set<string>()
  const columns = headers.map((header, index) => {
    const blank = header === null || header === ''
    const recognized = header !== null && knownHeaders.has(header)
    if (recognized) presentKnownHeaders.add(header)
    return {
      columnNumber: index + 1,
      header,
      recognized,
      duplicate: !blank && (counts.get(header) ?? 0) > 1,
      blank,
    }
  })

  return {
    columns,
    missingHeaders: importSourceHeaders.filter((header) => !presentKnownHeaders.has(header)),
    unrecognizedColumns: columns
      .filter((column): column is ImportHeaderDiagnostic & { header: string } => !column.blank && !column.recognized && column.header !== null)
      .map(({ columnNumber, header }) => ({ columnNumber, header })),
  }
}
