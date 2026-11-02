namespace ProductMasterData.Application.Imports;

public sealed record WorkbookMCodeValue(int RowNumber, string Value);

public sealed record WorkbookMCodeScan(
    string WorksheetName,
    int ScannedRows,
    IReadOnlyList<WorkbookMCodeValue> Values);

public interface IWorkbookMCodeScanner
{
    WorkbookMCodeScan ScanMCode(
        ReadOnlyMemory<byte> workbookBytes,
        string worksheetName,
        int mCodeColumnNumber,
        CancellationToken cancellationToken);
}

public sealed class InvalidMCodeColumnException : Exception
{
}

public sealed class WorkbookRowLimitExceededException : Exception
{
}
