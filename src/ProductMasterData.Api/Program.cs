using Microsoft.Extensions.Diagnostics.HealthChecks;
using ProductMasterData.Api.Health;
using ProductMasterData.Application.Health;
using ProductMasterData.Infrastructure.Health;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IDatabaseReadinessProbe>(
    new NpgsqlPostgresReadinessProbe(builder.Configuration.GetConnectionString("Postgres")));

builder.Services
    .AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddCheck<PostgresHealthCheck>("postgres", tags: ["ready"], timeout: TimeSpan.FromSeconds(3));

var app = builder.Build();
app.MapProductHealthEndpoints();
app.Run();

public partial class Program { }
