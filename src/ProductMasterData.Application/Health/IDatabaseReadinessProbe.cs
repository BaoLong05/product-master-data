namespace ProductMasterData.Application.Health;

public interface IDatabaseReadinessProbe
{
    Task<bool> IsReadyAsync(CancellationToken cancellationToken);
}
