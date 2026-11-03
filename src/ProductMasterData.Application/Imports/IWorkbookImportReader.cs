namespace ProductMasterData.Application.Imports;

public sealed record WorkbookImportRow(int RowNumber, IReadOnlyList<string?> Values);

public sealed record WorkbookImportData(
    string WorksheetName,
    IReadOnlyList<string?> Headers,
    IReadOnlyList<WorkbookImportRow> Rows);

public interface IWorkbookImportReader
{
    WorkbookImportData ReadRows(
        ReadOnlyMemory<byte> workbookBytes,
        string worksheetName,
        CancellationToken cancellationToken);
}
