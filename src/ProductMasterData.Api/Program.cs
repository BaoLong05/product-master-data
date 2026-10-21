using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;
using ProductMasterData.Api.Health;
using ProductMasterData.Application.Health;
using ProductMasterData.Infrastructure.Health;
using ProductMasterData.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
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
app.UseAuthentication();
app.UseAuthorization();
app.MapOpenApi();
app.MapProductHealthEndpoints();
app.MapGet("/api/v1/auth/me", (ClaimsPrincipal user) => Results.Ok(new CurrentIdentityResponse(
        user.FindFirstValue(ClaimTypes.NameIdentifier),
        user.FindFirstValue(ClaimTypes.Email)))
    )
    .RequireAuthorization();
app.Run();

internal sealed record CurrentIdentityResponse(string? UserId, string? Email);

public partial class Program { }
