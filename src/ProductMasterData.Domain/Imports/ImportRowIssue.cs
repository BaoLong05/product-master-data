namespace ProductMasterData.Domain.Imports;

public sealed class ImportRowIssue
{
    private ImportRowIssue()
    {
    }

    public Guid Id { get; private set; }
    public Guid BatchId { get; private set; }
    public int RowNumber { get; private set; }
    public string Code { get; private set; } = string.Empty;

    public static ImportRowIssue Create(Guid batchId, int rowNumber, string code)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(rowNumber);
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        return new ImportRowIssue
        {
            Id = Guid.NewGuid(),
            BatchId = batchId,
            RowNumber = rowNumber,
            Code = code
        };
    }
}
