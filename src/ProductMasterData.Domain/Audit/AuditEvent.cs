namespace ProductMasterData.Domain.Audit;

public sealed class AuditEvent
{
    private AuditEvent()
    {
    }

    public Guid EventId { get; private set; }
    public Guid? ActorId { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }
    public string Action { get; private set; } = string.Empty;
    public string Target { get; private set; } = string.Empty;
    public string Outcome { get; private set; } = string.Empty;
    public string CorrelationId { get; private set; } = string.Empty;
    public string MetadataJson { get; private set; } = "{}";

    public static AuditEvent Create(
        Guid? actorId,
        string action,
        string target,
        string outcome,
        string correlationId,
        string metadataJson)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(action);
        ArgumentException.ThrowIfNullOrWhiteSpace(target);
        ArgumentException.ThrowIfNullOrWhiteSpace(outcome);
        ArgumentException.ThrowIfNullOrWhiteSpace(correlationId);
        ArgumentException.ThrowIfNullOrWhiteSpace(metadataJson);

        return new AuditEvent
        {
            EventId = Guid.NewGuid(),
            ActorId = actorId,
            OccurredAt = DateTimeOffset.UtcNow,
            Action = action,
            Target = target,
            Outcome = outcome,
            CorrelationId = correlationId,
            MetadataJson = metadataJson
        };
    }
}
