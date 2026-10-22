export type ImportTargetField = { key: string; label: string }
export type ImportColumnMapping = Readonly<Record<number, string>>
export type ImportPreviewRow = { rowNumber: number; values: (string | null)[]; formulaColumns: number[] }
export type MappedImportColumn = { columnNumber: number; targetLabel: string }
export type MappedImportCell = { value: string | null; formula: boolean }
export type MappedImportRow = { rowNumber: number; values: MappedImportCell[] }
export type MappedImportPreview = { columns: MappedImportColumn[]; rows: MappedImportRow[] }

export function updateImportColumnMapping(
  mapping: ImportColumnMapping,
  columnNumber: number,
  targetKey: string,
  fields: readonly ImportTargetField[],
): ImportColumnMapping {
  if (!Number.isInteger(columnNumber) || columnNumber < 1) return mapping
  const nextMapping = { ...mapping }
  if (targetKey === '') {
    delete nextMapping[columnNumber]
    return nextMapping
  }
  if (!fields.some((field) => field.key === targetKey)) return mapping
  if (Object.entries(mapping).some(([sourceColumn, assignedKey]) => Number(sourceColumn) !== columnNumber && assignedKey === targetKey)) {
    return mapping
  }
  nextMapping[columnNumber] = targetKey
  return nextMapping
}

export function availableImportTargetFields(
  fields: readonly ImportTargetField[],
  mapping: ImportColumnMapping,
  columnNumber: number,
): ImportTargetField[] {
  const assignedElsewhere = new Set(
    Object.entries(mapping)
      .filter(([sourceColumn]) => Number(sourceColumn) !== columnNumber)
      .map(([, targetKey]) => targetKey),
  )
  return fields.filter(({ key }) => !assignedElsewhere.has(key))
}

export function buildMappedImportPreview(
  headers: readonly (string | null)[],
  rows: readonly ImportPreviewRow[],
  mapping: ImportColumnMapping,
  fields: readonly ImportTargetField[],
): MappedImportPreview {
  const columns = headers.flatMap((_, index) => {
    const columnNumber = index + 1
    const targetKey = mapping[columnNumber]
    const targetField = fields.find((field) => field.key === targetKey)
    return targetField ? [{ columnNumber, targetLabel: targetField.label }] : []
  })

  return {
    columns,
    rows: rows.map((row) => ({
      rowNumber: row.rowNumber,
      values: columns.map(({ columnNumber }) => {
        const formula = row.formulaColumns.includes(columnNumber)
        return { value: formula ? null : row.values[columnNumber - 1] ?? null, formula }
      }),
    })),
  }
}
