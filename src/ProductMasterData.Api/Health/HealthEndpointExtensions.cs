using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ProductMasterData.Api.Health;

public static class HealthEndpointExtensions
{
    public static IEndpointRouteBuilder MapProductHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHealthChecks("/health/live", CreateOptions("live"));
        endpoints.MapHealthChecks("/health/ready", CreateOptions("ready"));

        return endpoints;
    }

    private static HealthCheckOptions CreateOptions(string tag) => new()
    {
        Predicate = registration => registration.Tags.Contains(tag),
        ResultStatusCodes =
        {
            [HealthStatus.Healthy] = StatusCodes.Status200OK,
            [HealthStatus.Degraded] = StatusCodes.Status503ServiceUnavailable,
            [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable
        },
        ResponseWriter = WriteResponseAsync
    };

    private static Task WriteResponseAsync(HttpContext context, HealthReport report) =>
        context.Response.WriteAsJsonAsync(
            new HealthStatusResponse(report.Status.ToString()),
            cancellationToken: context.RequestAborted);

    private sealed record HealthStatusResponse(string Status);
}
