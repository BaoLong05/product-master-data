using Microsoft.Extensions.Diagnostics.HealthChecks;
using ProductMasterData.Application.Health;

namespace ProductMasterData.Api.Health;

public sealed class PostgresHealthCheck(IDatabaseReadinessProbe readinessProbe) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var isReady = await readinessProbe.IsReadyAsync(cancellationToken);
        return isReady
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy("PostgreSQL is unavailable.");
    }
}
