using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using ProductMasterData.Application.Imports;

namespace ProductMasterData.Infrastructure.Imports;

public sealed class OpenXmlWorkbookPreviewReader : IWorkbookPreviewReader
{
    private const int MaximumWorksheets = 20;
    private const int MaximumColumns = 100;
    private const long MaximumXmlCharactersPerPart = 1_000_000;

    public WorkbookPreview ReadHeaders(ReadOnlyMemory<byte> workbookBytes)
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

            var previews = new List<WorksheetPreview>(sheets.Length);
            foreach (var sheet in sheets)
            {
                if (string.IsNullOrWhiteSpace(sheet.Name?.Value) || string.IsNullOrWhiteSpace(sheet.Id?.Value))
                {
                    throw new InvalidWorkbookException("The workbook contains an invalid worksheet reference.");
                }

                if (workbookPart.GetPartById(sheet.Id.Value) is not WorksheetPart worksheetPart)
                {
                    throw new InvalidWorkbookException("The workbook contains an unsupported worksheet reference.");
                }

                var (headers, sharedStringReferences) = ReadHeaders(worksheetPart);
                if (sharedStringReferences.Count > 0)
                {
                    var sharedStringPart = workbookPart.SharedStringTablePart
                        ?? throw new InvalidWorkbookException("The workbook is missing its shared string table.");
                    ReadSharedStringHeaders(sharedStringPart, sharedStringReferences, headers);
                }

                previews.Add(new WorksheetPreview(sheet.Name.Value, headers));
            }

            return new WorkbookPreview(previews);
        }
        catch (Exception exception) when (exception is OpenXmlPackageException or InvalidDataException or ArgumentException or FormatException or OverflowException or System.Xml.XmlException)
        {
            throw new InvalidWorkbookException("The uploaded file is not a supported .xlsx workbook.");
        }
    }

    private static (string?[] Headers, List<(int SharedStringIndex, int ColumnIndex)> SharedStringReferences) ReadHeaders(WorksheetPart worksheetPart)
    {
        using var reader = OpenXmlReader.Create(worksheetPart);
        Row? headerRow = null;
        while (reader.Read())
        {
            if (reader.ElementType == typeof(Row))
            {
                headerRow = reader.LoadCurrentElement() as Row
                    ?? throw new InvalidWorkbookException("The workbook contains an invalid header row.");
                break;
            }
        }

        var cells = headerRow?.Elements<Cell>().ToArray() ?? [];
        var columnCount = cells.Length == 0 ? 0 : cells.Max(cell => GetColumnIndex(cell.CellReference?.Value));
        var headers = new string?[columnCount];
        var sharedStringReferences = new List<(int SharedStringIndex, int ColumnIndex)>();
        foreach (var cell in cells)
        {
            var columnIndex = GetColumnIndex(cell.CellReference?.Value);
            if (cell.CellFormula is not null)
            {
                continue;
            }

            if (cell.DataType?.Value == CellValues.InlineString)
            {
                headers[columnIndex - 1] = cell.InlineString?.InnerText;
            }
            else if (cell.DataType?.Value == CellValues.SharedString)
            {
                if (!int.TryParse(cell.CellValue?.Text, out var sharedStringIndex) || sharedStringIndex < 0)
                {
                    throw new InvalidWorkbookException("The workbook contains an invalid shared string reference.");
                }

                sharedStringReferences.Add((sharedStringIndex, columnIndex - 1));
            }
            else
            {
                headers[columnIndex - 1] = cell.CellValue?.Text;
            }
        }

        return (headers, sharedStringReferences);
    }

    private static void ReadSharedStringHeaders(
        SharedStringTablePart sharedStringPart,
        IReadOnlyList<(int SharedStringIndex, int ColumnIndex)> references,
        string?[] headers)
    {
        var remaining = references
            .GroupBy(reference => reference.SharedStringIndex)
            .ToDictionary(group => group.Key, group => group.Select(reference => reference.ColumnIndex).ToArray());
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
            if (remaining.Remove(index, out var columnIndexes))
            {
                foreach (var columnIndex in columnIndexes)
                {
                    headers[columnIndex] = item.InnerText;
                }
            }
        }

        if (remaining.Count > 0)
        {
            throw new InvalidWorkbookException("The workbook contains a shared string reference outside the supported table.");
        }
    }

    private static int GetColumnIndex(string? cellReference)
    {
        if (string.IsNullOrWhiteSpace(cellReference))
        {
            throw new InvalidWorkbookException("The workbook contains a header cell without a column reference.");
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
