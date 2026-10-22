namespace ProductMasterData.Application.Imports;

public sealed record WorkbookPreview(IReadOnlyList<WorksheetPreview> Worksheets);

public sealed record WorksheetPreview(
    string Name,
    IReadOnlyList<string?> Headers,
    IReadOnlyList<WorkbookPreviewRow>? Rows = null);

public sealed record WorkbookPreviewRow(
    int RowNumber,
    IReadOnlyList<string?> Values,
    IReadOnlyList<int> FormulaColumns);

public interface IWorkbookPreviewReader
{
    WorkbookPreview ReadPreview(ReadOnlyMemory<byte> workbookBytes, string? worksheetName);
}
