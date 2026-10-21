using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ProductMasterData.Infrastructure.Identity;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Tests;

public sealed class LocalLoginEndpointTests
{
    [Fact]
    public async Task Login_without_antiforgery_token_is_rejected_before_credentials_are_checked()
    {
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync("csrf.test", "A-strong-login-passphrase-2026");
        using var client = CreateHttpsClient(factory);

        using var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest("csrf.test", "A-strong-login-passphrase-2026"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task Login_with_invalid_antiforgery_token_is_rejected()
    {
        using var factory = new LoginApiFactory();
        using var client = CreateHttpsClient(factory);
        await AddAntiforgeryTokenAsync(client);
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", "invalid-token");

        using var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest("unknown.user", "incorrect-password"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task Sixth_login_attempt_from_same_client_is_rate_limited()
    {
        using var factory = new LoginApiFactory();
        using var client = CreateHttpsClient(factory);
        await AddAntiforgeryTokenAsync(client);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new LoginRequest("unknown.user", "incorrect-password"));
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        using var limitedResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest("unknown.user", "incorrect-password"));

        Assert.Equal(HttpStatusCode.TooManyRequests, limitedResponse.StatusCode);
        using var liveResponse = await client.GetAsync("/health/live");
        Assert.Equal(HttpStatusCode.OK, liveResponse.StatusCode);
    }

    [Fact]
    public async Task Active_user_with_valid_password_gets_cookie_and_authenticates_current_identity()
    {
        const string userName = "login.test";
        const string password = "A-strong-login-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        using var client = CreateHttpsClient(factory);
        await AddAntiforgeryTokenAsync(client);

        using var login = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(userName, password));

        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);
        Assert.True(login.Headers.TryGetValues("Set-Cookie", out var cookies));
        Assert.Contains(cookies, cookie => cookie.Contains("HttpOnly", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(cookies, cookie => cookie.Contains("Secure", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(cookies, cookie => cookie.Contains("SameSite=Strict", StringComparison.OrdinalIgnoreCase));
        using var currentIdentity = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, currentIdentity.StatusCode);
    }

    [Fact]
    public async Task Invalid_password_returns_unauthorized_without_issuing_a_cookie()
    {
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync("login.test", "A-strong-login-passphrase-2026");
        using var client = CreateHttpsClient(factory);
        await AddAntiforgeryTokenAsync(client);

        using var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest("login.test", "incorrect-password"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
        Assert.DoesNotContain("login.test", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Inactive_user_cannot_sign_in()
    {
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync("inactive.test", "A-strong-login-passphrase-2026", isActive: false);
        using var client = CreateHttpsClient(factory);
        await AddAntiforgeryTokenAsync(client);

        using var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest("inactive.test", "A-strong-login-passphrase-2026"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
        Assert.DoesNotContain("inactive.test", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Missing_username_is_rejected_without_echoing_password()
    {
        using var factory = new LoginApiFactory();
        using var client = CreateHttpsClient(factory);
        await AddAntiforgeryTokenAsync(client);

        using var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(" ", "must-not-be-echoed"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.DoesNotContain("must-not-be-echoed", await response.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    private sealed record LoginRequest(string? UserName, string? Password);
    private sealed record CsrfTokenResponse(string? RequestToken);

    private static HttpClient CreateHttpsClient(LoginApiFactory factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true,
            BaseAddress = new Uri("https://localhost")
        });

    private static async Task AddAntiforgeryTokenAsync(HttpClient client)
    {
        using var tokenResponse = await client.GetAsync("/api/v1/auth/csrf");
        Assert.Equal(HttpStatusCode.OK, tokenResponse.StatusCode);
        Assert.True(tokenResponse.Headers.TryGetValues("Set-Cookie", out var cookies));
        Assert.Contains(cookies, cookie => cookie.Contains("HttpOnly", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(cookies, cookie => cookie.Contains("Secure", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(cookies, cookie => cookie.Contains("SameSite=Strict", StringComparison.OrdinalIgnoreCase));

        var response = await tokenResponse.Content.ReadFromJsonAsync<CsrfTokenResponse>();
        Assert.False(string.IsNullOrWhiteSpace(response?.RequestToken));
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", response!.RequestToken);
    }
}

public sealed class LoginApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<ProductMasterDataDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<ProductMasterDataDbContext>>();
            services.RemoveAll<ProductMasterDataDbContext>();
            services.AddDbContext<ProductMasterDataDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName));
            services.AddIdentityCore<ApplicationUser>()
                .AddRoles<ApplicationRole>()
                .AddEntityFrameworkStores<ProductMasterDataDbContext>();
        });
    }

    public async Task CreateUserAsync(string userName, string password, bool isActive = true)
    {
        using var scope = Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        await database.Database.EnsureCreatedAsync();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var result = await users.CreateAsync(new ApplicationUser { UserName = userName, IsActive = isActive }, password);
        Assert.True(result.Succeeded, string.Join("; ", result.Errors.Select(error => error.Description)));
    }
}
