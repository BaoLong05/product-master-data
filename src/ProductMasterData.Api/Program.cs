using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using ProductMasterData.Api.Health;
using ProductMasterData.Application.Health;
using ProductMasterData.Infrastructure.Health;
using ProductMasterData.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
    };
});

builder.Services.AddSingleton<IDatabaseReadinessProbe>(
    new NpgsqlPostgresReadinessProbe(builder.Configuration.GetConnectionString("Postgres")));
builder.Services.AddDbContext<ProductMasterDataDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services
    .AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddCheck<PostgresHealthCheck>("postgres", tags: ["ready"], timeout: TimeSpan.FromSeconds(3));

var app = builder.Build();
app.UseStatusCodePages();
app.MapOpenApi();
app.MapProductHealthEndpoints();
app.Run();

public partial class Program { }
