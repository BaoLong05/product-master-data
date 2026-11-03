namespace ProductMasterData.Domain.Imports;

public sealed class ImportBatch
{
    private ImportBatch()
    {
    }

    public Guid Id { get; private set; }
    public Guid InitiatingUserId { get; private set; }
    public string SourceFileName { get; private set; } = string.Empty;
    public string RequestFingerprint { get; private set; } = string.Empty;
    public string Status { get; private set; } = "completed";
    public DateTimeOffset StartedAt { get; private set; }
    public DateTimeOffset CompletedAt { get; private set; }
    public int ScannedRows { get; private set; }
    public int ImportedRows { get; private set; }
    public int SkippedRows { get; private set; }
    public ICollection<ImportRowIssue> Issues { get; private set; } = new List<ImportRowIssue>();

    public static ImportBatch Create(
        Guid initiatingUserId,
        string sourceFileName,
        string requestFingerprint,
        int scannedRows,
        int importedRows,
        int skippedRows)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceFileName);
        ArgumentException.ThrowIfNullOrWhiteSpace(requestFingerprint);
        if (scannedRows < 0 || importedRows < 0 || skippedRows < 0 || importedRows + skippedRows != scannedRows)
        {
            throw new ArgumentOutOfRangeException(nameof(scannedRows));
        }

        var now = DateTimeOffset.UtcNow;
        return new ImportBatch
        {
            Id = Guid.NewGuid(),
            InitiatingUserId = initiatingUserId,
            SourceFileName = sourceFileName,
            RequestFingerprint = requestFingerprint,
            StartedAt = now,
            CompletedAt = now,
            ScannedRows = scannedRows,
            ImportedRows = importedRows,
            SkippedRows = skippedRows
        };
    }
}
