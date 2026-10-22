namespace ProductMasterData.Application.Imports;

public sealed record WorkbookPreview(IReadOnlyList<WorksheetPreview> Worksheets);

public sealed record WorksheetPreview(string Name, IReadOnlyList<string?> Headers);

public interface IWorkbookPreviewReader
{
    WorkbookPreview ReadHeaders(ReadOnlyMemory<byte> workbookBytes);
}
