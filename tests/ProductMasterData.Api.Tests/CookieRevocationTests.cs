using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ProductMasterData.Api.Tests;

public sealed class CookieRevocationTests
{
    [Fact]
    public async Task Logout_invalidates_a_copied_cookie_in_another_client()
    {
        const string userName = "session.revoke.test";
        const string password = "A-strong-revocation-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        using var ownerClient = CreateHttpsClient(factory);
        var requestToken = await GetRequestTokenAsync(ownerClient);
        ownerClient.DefaultRequestHeaders.Add("X-CSRF-TOKEN", requestToken);

        using var login = await ownerClient.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(userName, password));

        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);
        var authCookie = Assert.Single(login.Headers.GetValues("Set-Cookie"))
            .Split(';', 2)[0];

        using var copiedCookieClient = CreateHttpsClient(factory);
        copiedCookieClient.DefaultRequestHeaders.Add("Cookie", authCookie);
        using var beforeLogout = await copiedCookieClient.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, beforeLogout.StatusCode);

        ownerClient.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        ownerClient.DefaultRequestHeaders.Add("X-CSRF-TOKEN", await GetRequestTokenAsync(ownerClient));
        using var logout = await ownerClient.PostAsync("/api/v1/auth/logout", content: null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        using var afterLogout = await copiedCookieClient.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, afterLogout.StatusCode);
    }

    [Fact]
    public async Task Deactivating_user_invalidates_an_existing_cookie_on_next_request()
    {
        const string userName = "session.deactivate.test";
        const string password = "A-strong-revocation-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        using var client = CreateHttpsClient(factory);
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", await GetRequestTokenAsync(client));
        using var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(userName, password));
        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);
        using var authenticatedIdentity = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, authenticatedIdentity.StatusCode);

        await factory.DeactivateUserAsync(userName);

        using var identityAfterDeactivation = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, identityAfterDeactivation.StatusCode);
    }

    [Fact]
    public async Task Cookie_without_security_stamp_is_rejected()
    {
        const string userName = "session.no-stamp.test";
        const string password = "A-strong-revocation-passphrase-2026";
        using var factory = new LoginApiFactory(removeSecurityStampOnSignIn: true);
        await factory.CreateUserAsync(userName, password);
        using var client = CreateHttpsClient(factory);
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", await GetRequestTokenAsync(client));
        using var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(userName, password));
        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);

        using var identity = await client.GetAsync("/api/v1/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, identity.StatusCode);
    }

    private sealed record LoginRequest(string UserName, string Password);
    private sealed record CsrfTokenResponse(string? RequestToken);

    private static HttpClient CreateHttpsClient(LoginApiFactory factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true,
            BaseAddress = new Uri("https://localhost")
        });

    private static async Task<string> GetRequestTokenAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/api/v1/auth/csrf");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<CsrfTokenResponse>();
        Assert.False(string.IsNullOrWhiteSpace(payload?.RequestToken));
        return payload!.RequestToken!;
    }
}
