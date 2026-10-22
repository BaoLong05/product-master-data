using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using ProductMasterData.Application.Imports;

namespace ProductMasterData.Infrastructure.Imports;

public sealed class OpenXmlWorkbookPreviewReader : IWorkbookPreviewReader
{
    private const int MaximumWorksheets = 20;
    private const int MaximumColumns = 100;
    private const int MaximumPreviewRows = 10;
    private const long MaximumXmlCharactersPerPart = 1_000_000;

    public WorkbookPreview ReadPreview(ReadOnlyMemory<byte> workbookBytes, string? worksheetName)
    {
        try
        {
            using var stream = new MemoryStream(workbookBytes.ToArray(), writable: false);
            using var workbook = SpreadsheetDocument.Open(stream, false, new OpenSettings
            {
                MaxCharactersInPart = MaximumXmlCharactersPerPart
            });
            var workbookPart = workbook.WorkbookPart
                ?? throw new InvalidWorkbookException("The workbook does not contain a workbook part.");
            var sheets = workbookPart.Workbook?.Sheets?.Elements<Sheet>().ToArray() ?? [];
            if (sheets.Length is < 1 or > MaximumWorksheets)
            {
                throw new InvalidWorkbookException($"The workbook must contain between 1 and {MaximumWorksheets} worksheets.");
            }

            var selectedSheets = SelectSheets(sheets, worksheetName);
            var previews = new List<WorksheetPreview>(selectedSheets.Length);
            foreach (var sheet in selectedSheets)
            {
                if (string.IsNullOrWhiteSpace(sheet.Name?.Value) || string.IsNullOrWhiteSpace(sheet.Id?.Value))
                {
                    throw new InvalidWorkbookException("The workbook contains an invalid worksheet reference.");
                }

                if (workbookPart.GetPartById(sheet.Id.Value) is not WorksheetPart worksheetPart)
                {
                    throw new InvalidWorkbookException("The workbook contains an unsupported worksheet reference.");
                }

                var (headerRow, dataRows) = ReadWorksheetRows(worksheetPart, includeDataRows: worksheetName is not null);
                var rawRows = new List<RawPreviewRow>();
                if (headerRow is not null)
                {
                    var rowNumber = GetRowNumber(headerRow, 1);
                    rawRows.Add(ReadCellValues(headerRow, rowNumber));
                    foreach (var dataRow in dataRows)
                    {
                        rawRows.Add(ReadCellValues(dataRow, GetRowNumber(dataRow, checked(rawRows[^1].RowNumber + 1))));
                    }
                }

                var sharedStringRows = rawRows.Where(row => row.SharedStringReferences.Count > 0).ToArray();
                if (sharedStringRows.Length > 0)
                {
                    var sharedStringPart = workbookPart.SharedStringTablePart
                        ?? throw new InvalidWorkbookException("The workbook is missing its shared string table.");
                    ReadSharedStringValues(sharedStringPart, sharedStringRows);
                }

                var columnCount = rawRows.Count == 0 ? 0 : rawRows.Max(row => row.Values.Length);
                for (var index = 0; index < rawRows.Count; index++)
                {
                    var row = rawRows[index];
                    if (row.Values.Length < columnCount)
                    {
                        rawRows[index] = row with
                        {
                            Values = row.Values.Concat(new string?[columnCount - row.Values.Length]).ToArray()
                        };
                    }
                }

                var headers = rawRows.FirstOrDefault()?.Values ?? [];
                var previewRows = worksheetName is null
                    ? null
                    : rawRows.Skip(1)
                        .Select(row => new WorkbookPreviewRow(row.RowNumber, row.Values, row.FormulaColumns))
                        .ToArray();
                previews.Add(new WorksheetPreview(sheet.Name.Value, headers, previewRows));
            }

            return new WorkbookPreview(previews);
        }
        catch (Exception exception) when (exception is OpenXmlPackageException or InvalidDataException or ArgumentException or FormatException or OverflowException or System.Xml.XmlException)
        {
            throw new InvalidWorkbookException("The uploaded file is not a supported .xlsx workbook.");
        }
    }

    private static Sheet[] SelectSheets(IReadOnlyList<Sheet> sheets, string? worksheetName)
    {
        if (worksheetName is null)
        {
            return sheets.ToArray();
        }

        var matchingSheets = sheets.Where(sheet => string.Equals(sheet.Name?.Value, worksheetName, StringComparison.Ordinal)).ToArray();
        return matchingSheets.Length == 1
            ? matchingSheets
            : throw new InvalidWorkbookException("The workbook does not contain exactly one worksheet with that name.");
    }

    private static (Row? Header, IReadOnlyList<Row> DataRows) ReadWorksheetRows(WorksheetPart worksheetPart, bool includeDataRows)
    {
        using var reader = OpenXmlReader.Create(worksheetPart);
        Row? header = null;
        var dataRows = new List<Row>(includeDataRows ? MaximumPreviewRows : 0);
        while (reader.Read())
        {
            if (reader.ElementType != typeof(Row))
            {
                continue;
            }

            var row = reader.LoadCurrentElement() as Row
                ?? throw new InvalidWorkbookException("The workbook contains an invalid worksheet row.");
            if (header is null)
            {
                header = row;
                if (!includeDataRows)
                {
                    break;
                }

                continue;
            }

            dataRows.Add(row);
            if (dataRows.Count == MaximumPreviewRows)
            {
                break;
            }
        }

        return (header, dataRows);
    }

    private static RawPreviewRow ReadCellValues(Row row, int rowNumber)
    {
        var cells = row.Elements<Cell>().ToArray();
        var columnCount = cells.Length == 0 ? 0 : cells.Max(cell => GetColumnIndex(cell.CellReference?.Value));
        var values = new string?[columnCount];
        var formulaColumns = new List<int>();
        var sharedStringReferences = new List<(int SharedStringIndex, int ColumnIndex)>();
        foreach (var cell in cells)
        {
            var columnIndex = GetColumnIndex(cell.CellReference?.Value) - 1;
            if (cell.CellFormula is not null)
            {
                formulaColumns.Add(columnIndex + 1);
                continue;
            }

            if (cell.DataType?.Value == CellValues.InlineString)
            {
                values[columnIndex] = cell.InlineString?.InnerText;
            }
            else if (cell.DataType?.Value == CellValues.SharedString)
            {
                if (!int.TryParse(cell.CellValue?.Text, out var sharedStringIndex) || sharedStringIndex < 0)
                {
                    throw new InvalidWorkbookException("The workbook contains an invalid shared string reference.");
                }

                sharedStringReferences.Add((sharedStringIndex, columnIndex));
            }
            else
            {
                values[columnIndex] = cell.CellValue?.Text;
            }
        }

        return new RawPreviewRow(rowNumber, values, formulaColumns, sharedStringReferences);
    }

    private static int GetRowNumber(Row row, int fallbackRowNumber)
    {
        var rowIndex = row.RowIndex?.Value;
        return rowIndex is null ? fallbackRowNumber : checked((int)rowIndex.Value);
    }

    private static void ReadSharedStringValues(
        SharedStringTablePart sharedStringPart,
        IReadOnlyList<RawPreviewRow> rows)
    {
        var references = rows.SelectMany(row => row.SharedStringReferences.Select(reference =>
            (reference.SharedStringIndex, Row: row, reference.ColumnIndex)));
        var remaining = references
            .GroupBy(reference => reference.SharedStringIndex)
            .ToDictionary(group => group.Key, group => group.Select(reference => (reference.Row, reference.ColumnIndex)).ToArray());
        using var reader = OpenXmlReader.Create(sharedStringPart);
        var index = -1;
        while (reader.Read() && remaining.Count > 0)
        {
            if (reader.ElementType != typeof(SharedStringItem))
            {
                continue;
            }

            index++;
            var item = reader.LoadCurrentElement() as SharedStringItem
                ?? throw new InvalidWorkbookException("The workbook contains an invalid shared string item.");
            if (remaining.Remove(index, out var targets))
            {
                foreach (var (row, columnIndex) in targets)
                {
                    row.Values[columnIndex] = item.InnerText;
                }
            }
        }

        if (remaining.Count > 0)
        {
            throw new InvalidWorkbookException("The workbook contains a shared string reference outside the supported table.");
        }
    }

    private sealed record RawPreviewRow(
        int RowNumber,
        string?[] Values,
        IReadOnlyList<int> FormulaColumns,
        IReadOnlyList<(int SharedStringIndex, int ColumnIndex)> SharedStringReferences);

    private static int GetColumnIndex(string? cellReference)
    {
        if (string.IsNullOrWhiteSpace(cellReference))
        {
            throw new InvalidWorkbookException("The workbook contains a cell without a column reference.");
        }

        var index = 0;
        foreach (var character in cellReference)
        {
            if (!char.IsAsciiLetter(character))
            {
                break;
            }

            index = checked(index * 26 + char.ToUpperInvariant(character) - 'A' + 1);
        }

        if (index < 1 || index > MaximumColumns)
        {
            throw new InvalidWorkbookException($"A worksheet cannot contain more than {MaximumColumns} header columns.");
        }

        return index;
    }
}
