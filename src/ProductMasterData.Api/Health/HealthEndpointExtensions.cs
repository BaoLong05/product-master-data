using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ProductMasterData.Api.Health;

public static class HealthEndpointExtensions
{
    public static IEndpointRouteBuilder MapProductHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        MapHealthEndpoint(endpoints, "/health/live", "live", "LiveHealth");
        MapHealthEndpoint(endpoints, "/health/ready", "ready", "ReadyHealth");

        return endpoints;
    }

    private static void MapHealthEndpoint(
        IEndpointRouteBuilder endpoints,
        string path,
        string tag,
        string operationName)
    {
        endpoints.MapGet(path, async (HealthCheckService healthChecks, HttpContext context) =>
        {
            var report = await healthChecks.CheckHealthAsync(
                registration => registration.Tags.Contains(tag),
                context.RequestAborted);
            var statusCode = report.Status == HealthStatus.Healthy
                ? StatusCodes.Status200OK
                : StatusCodes.Status503ServiceUnavailable;

            return Results.Json(new HealthStatusResponse(report.Status.ToString()), statusCode: statusCode);
        }).WithName(operationName);
    }

    private sealed record HealthStatusResponse(string Status);
}
