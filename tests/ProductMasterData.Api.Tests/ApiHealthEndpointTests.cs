using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.DependencyInjection;

namespace ProductMasterData.Api.Tests;

public sealed class ApiHealthEndpointTests
{
    [Fact]
    public async Task Live_endpoint_is_healthy_even_when_database_is_unhealthy()
    {
        using var factory = new ApiFactory(databaseIsHealthy: false);
        using var response = await factory.CreateClient().GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.Equal("Healthy", payload?.Status);
    }

    [Fact]
    public async Task Ready_endpoint_is_healthy_when_database_is_healthy()
    {
        using var factory = new ApiFactory(databaseIsHealthy: true);
        using var response = await factory.CreateClient().GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.Equal("Healthy", payload?.Status);
    }

    [Fact]
    public async Task Ready_endpoint_is_unavailable_without_exposing_database_details()
    {
        using var factory = new ApiFactory(databaseIsHealthy: false);
        using var response = await factory.CreateClient().GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Equal("Unhealthy", JsonDocument.Parse(body).RootElement.GetProperty("status").GetString());
        Assert.DoesNotContain("DO_NOT_LEAK", body, StringComparison.Ordinal);
        Assert.DoesNotContain("private-db", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Root_route_is_not_a_template_endpoint()
    {
        using var factory = new ApiFactory(databaseIsHealthy: true);
        using var response = await factory.CreateClient().GetAsync("/");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Unknown_route_returns_safe_problem_details()
    {
        using var factory = new ApiFactory(databaseIsHealthy: true);
        using var response = await factory.CreateClient().GetAsync("/not-a-route");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(404, body.RootElement.GetProperty("status").GetInt32());
        Assert.True(body.RootElement.GetProperty("traceId").GetString()?.Length > 0);
        Assert.DoesNotContain("DO_NOT_LEAK", body.RootElement.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Openapi_document_lists_health_routes()
    {
        using var factory = new ApiFactory(databaseIsHealthy: true);
        using var response = await factory.CreateClient().GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var paths = document.RootElement.GetProperty("paths");
        Assert.True(paths.TryGetProperty("/health/live", out _));
        Assert.True(paths.TryGetProperty("/health/ready", out _));
    }

    private sealed record HealthResponse(string Status);
}

public sealed class ApiFactory(bool databaseIsHealthy) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Postgres"] = "Host=127.0.0.1;Port=1;Database=private-db;Username=test;Password=DO_NOT_LEAK;Timeout=1"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.Configure<HealthCheckServiceOptions>(options =>
            {
                var databaseCheck = options.Registrations.SingleOrDefault(check => check.Name == "postgres");
                if (databaseCheck is not null)
                {
                    options.Registrations.Remove(databaseCheck);
                }

                options.Registrations.Add(new HealthCheckRegistration(
                    "postgres",
                    _ => new FixedHealthCheck(databaseIsHealthy),
                    HealthStatus.Unhealthy,
                    ["ready"]));
            });
        });
    }
}

internal sealed class FixedHealthCheck(bool isHealthy) : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var result = isHealthy
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy("DO_NOT_LEAK private-db connection failure");

        return Task.FromResult(result);
    }
}
