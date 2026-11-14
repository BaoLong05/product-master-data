using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Antiforgery;
using System.Threading.RateLimiting;
using System.Globalization;
using System.Security.Claims;
using Microsoft.Extensions.Localization;
using Microsoft.AspNetCore.Localization;
using ProductMasterData.Api;
using ProductMasterData.Api.Health;
using ProductMasterData.Api.Catalog;
using ProductMasterData.Api.Identity;
using ProductMasterData.Api.Imports;
using ProductMasterData.Application.Health;
using ProductMasterData.Application.Imports;
using ProductMasterData.Infrastructure.Identity;
using ProductMasterData.Infrastructure.Imports;
using ProductMasterData.Infrastructure.Health;
using ProductMasterData.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddLocalization();
builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    var cultures = new[] { new CultureInfo("vi"), new CultureInfo("en"), new CultureInfo("ko") };
    options.DefaultRequestCulture = new RequestCulture("vi");
    options.SupportedCultures = cultures;
    options.SupportedUICultures = cultures;
});

builder.Services.AddOpenApi();
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Events.OnValidatePrincipal = context =>
            context.HttpContext.RequestServices
                .GetRequiredService<ActiveUserCookieValidator>()
                .ValidateAsync(context);
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
builder.Services.AddAuthorization(PermissionPolicies.AddCatalogPolicies);
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
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
builder.Services.AddScoped<ActiveUserCookieValidator>();
builder.Services.AddSingleton<IWorkbookPreviewReader, OpenXmlWorkbookPreviewReader>();
builder.Services.AddSingleton<IWorkbookMCodeScanner, OpenXmlWorkbookPreviewReader>();
builder.Services.AddSingleton<IWorkbookImportReader, OpenXmlWorkbookPreviewReader>();

builder.Services
    .AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddCheck<PostgresHealthCheck>("postgres", tags: ["ready"], timeout: TimeSpan.FromSeconds(3));

var app = builder.Build();
app.UseRequestLocalization();
app.UseStatusCodePages();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseAntiforgery();
app.MapOpenApi();
app.MapProductHealthEndpoints();
app.MapProductRecordEndpoints();
app.MapImportPreviewEndpoints();
app.MapImportValidationEndpoints();
app.MapImportCommitEndpoints();
app.MapImportHistoryEndpoints();
app.MapGet("/api/v1/localization/{culture}", (string culture, IStringLocalizer<SharedResource> localizer) =>
{
    var cultureName = culture.ToLowerInvariant() switch
    {
        "vi" => "vi",
        "en" => "en",
        "ko" => "ko",
        _ => null,
    };
    if (cultureName is null) return Results.BadRequest(new { error = "unsupported_culture" });

    CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo(cultureName);
    CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo(cultureName);
    var translations = localizer.GetAllStrings(includeParentCultures: false)
        .ToDictionary(item => item.Name, item => item.Value, StringComparer.Ordinal);
    return Results.Ok(translations);
})
    .AllowAnonymous();

app.MapGet("/api/v1/auth/csrf", (HttpContext httpContext, IAntiforgery antiforgery) =>
{
    var tokens = antiforgery.GetAndStoreTokens(httpContext);
    return Results.Ok(new AntiforgeryTokenResponse(tokens.RequestToken));
})
    .AllowAnonymous();
app.MapPost("/api/v1/auth/login", async (
    LoginRequest request,
    UserManager<ApplicationUser> userManager,
    IUserClaimsPrincipalFactory<ApplicationUser> claimsPrincipalFactory,
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

    var principal = await claimsPrincipalFactory.CreateAsync(user);
    await httpContext.SignInAsync(
        CookieAuthenticationDefaults.AuthenticationScheme,
        principal);
    return Results.NoContent();
})
    .RequireRateLimiting("login")
    .AllowAnonymous();
app.MapPost("/api/v1/auth/logout", async (
    UserManager<ApplicationUser> userManager,
    IAntiforgery antiforgery,
    HttpContext httpContext) =>
{
    if (!await antiforgery.IsRequestValidAsync(httpContext))
    {
        return Results.BadRequest();
    }

    var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.Unauthorized();
    }

    var user = await userManager.FindByIdAsync(userId);
    if (user is null || !user.IsActive)
    {
        return Results.Unauthorized();
    }

    var stampUpdate = await userManager.UpdateSecurityStampAsync(user);
    if (!stampUpdate.Succeeded)
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
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
