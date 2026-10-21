using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Antiforgery;
using System.Threading.RateLimiting;
using System.Security.Claims;
using ProductMasterData.Api.Health;
using ProductMasterData.Application.Health;
using ProductMasterData.Infrastructure.Identity;
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
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
});
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "ProductMasterData.Antiforgery";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
});
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
builder.Services.AddIdentityCore<ApplicationUser>()
    .AddRoles<ApplicationRole>()
    .AddEntityFrameworkStores<ProductMasterDataDbContext>();

builder.Services
    .AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddCheck<PostgresHealthCheck>("postgres", tags: ["ready"], timeout: TimeSpan.FromSeconds(3));

var app = builder.Build();
app.UseStatusCodePages();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseAntiforgery();
app.MapOpenApi();
app.MapProductHealthEndpoints();
app.MapGet("/api/v1/auth/csrf", (HttpContext httpContext, IAntiforgery antiforgery) =>
{
    var tokens = antiforgery.GetAndStoreTokens(httpContext);
    return Results.Ok(new AntiforgeryTokenResponse(tokens.RequestToken));
})
    .AllowAnonymous();
app.MapPost("/api/v1/auth/login", async (
    LoginRequest request,
    UserManager<ApplicationUser> userManager,
    IAntiforgery antiforgery,
    HttpContext httpContext) =>
{
    if (!await antiforgery.IsRequestValidAsync(httpContext))
    {
        return Results.BadRequest();
    }

    if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest();
    }

    var user = await userManager.FindByNameAsync(request.UserName);
    if (user is null || !user.IsActive || !await userManager.CheckPasswordAsync(user, request.Password))
    {
        return Results.Unauthorized();
    }

    var claims = new List<Claim>
    {
        new(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new(ClaimTypes.Name, user.UserName ?? string.Empty)
    };
    if (!string.IsNullOrWhiteSpace(user.Email))
    {
        claims.Add(new Claim(ClaimTypes.Email, user.Email));
    }

    await httpContext.SignInAsync(
        CookieAuthenticationDefaults.AuthenticationScheme,
        new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)));
    return Results.NoContent();
})
    .RequireRateLimiting("login")
    .AllowAnonymous();
app.MapPost("/api/v1/auth/logout", async (
    IAntiforgery antiforgery,
    HttpContext httpContext) =>
{
    if (!await antiforgery.IsRequestValidAsync(httpContext))
    {
        return Results.BadRequest();
    }

    await httpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.NoContent();
})
    .RequireAuthorization();
app.MapGet("/api/v1/auth/me", (ClaimsPrincipal user) => Results.Ok(new CurrentIdentityResponse(
        user.FindFirstValue(ClaimTypes.NameIdentifier),
        user.FindFirstValue(ClaimTypes.Email)))
    )
    .RequireAuthorization();
app.Run();

internal sealed record CurrentIdentityResponse(string? UserId, string? Email);
internal sealed record LoginRequest(string? UserName, string? Password);
internal sealed record AntiforgeryTokenResponse(string? RequestToken);

public partial class Program { }
