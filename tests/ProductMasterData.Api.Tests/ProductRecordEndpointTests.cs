using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProductMasterData.Domain.Catalog;
using ProductMasterData.Domain.Identity;
using ProductMasterData.Infrastructure.Identity;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Tests;

public sealed class ProductRecordEndpointTests
{
    [Fact]
    public async Task User_with_record_permissions_can_create_and_retrieve_a_nullable_record()
    {
        const string userName = "record.create.test";
        const string password = "A-strong-record-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.create", "records.read");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var create = await client.PostAsJsonAsync("/api/v1/records", new
        {
            mCode = "PMD-1001",
            itemName = "Sample item",
            companyName = "Example company"
        });

        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        Assert.NotNull(create.Headers.Location);
        var created = await create.Content.ReadFromJsonAsync<ProductRecordResponse>();
        Assert.NotNull(created);
        Assert.NotEqual(Guid.Empty, created.Id);
        Assert.Equal("PMD-1001", created.MCode);
        Assert.Equal("Sample item", created.ItemName);
        Assert.Null(created.Note);

        using var detail = await client.GetAsync(create.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);
        var retrieved = await detail.Content.ReadFromJsonAsync<ProductRecordResponse>();
        Assert.Equal(created.Id, retrieved?.Id);
        Assert.Equal(created.MCode, retrieved?.MCode);
    }

    [Fact]
    public async Task Creating_a_record_writes_a_safe_audit_event_readable_by_an_auditor()
    {
        const string userName = "record.audit.test";
        const string password = "A-strong-record-audit-passphrase-2026";
        const string mCode = "AUDIT-SAFE-001";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.create", "audit.read");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var createResponse = await client.PostAsJsonAsync("/api/v1/records", new
        {
            mCode,
            note = "Do not copy this source value into audit metadata"
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<ProductRecordResponse>();
        Assert.NotNull(created);

        using var auditResponse = await client.GetAsync($"/api/v1/records/{created.Id}/audit");

        Assert.Equal(HttpStatusCode.OK, auditResponse.StatusCode);
        var events = await auditResponse.Content.ReadFromJsonAsync<List<ProductRecordAuditResponse>>();
        var auditEvent = Assert.Single(events!);
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        var actorId = (await database.Users.SingleAsync(item => item.UserName == userName)).Id;
        Assert.NotEqual(Guid.Empty, auditEvent.EventId);
        Assert.Equal(actorId, auditEvent.ActorId);
        Assert.Equal("records.created", auditEvent.Action);
        Assert.Equal($"product_records/{created.Id:D}", auditEvent.Target);
        Assert.Equal("succeeded", auditEvent.Outcome);
        Assert.Equal(TimeSpan.Zero, auditEvent.OccurredAt.Offset);
        Assert.False(string.IsNullOrWhiteSpace(auditEvent.CorrelationId));
        Assert.Equal(created.Id, auditEvent.Metadata.GetProperty("recordId").GetGuid());
        Assert.Single(auditEvent.Metadata.EnumerateObject());
        Assert.DoesNotContain(mCode, auditEvent.Metadata.GetRawText(), StringComparison.Ordinal);
        Assert.DoesNotContain("Do not copy this source value", auditEvent.Metadata.GetRawText(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Record_read_permission_does_not_grant_audit_read_access()
    {
        const string userName = "record.audit.denied.test";
        const string password = "A-strong-record-audit-denied-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.read");
        var recordId = await SeedRecordAsync(factory, "AUDIT-DENIED-001", "Existing record");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var response = await client.GetAsync($"/api/v1/records/{recordId}/audit");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Auditor_gets_not_found_for_an_unknown_product_record()
    {
        const string userName = "record.audit.missing.test";
        const string password = "A-strong-record-audit-missing-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "audit.read");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var response = await client.GetAsync($"/api/v1/records/{Guid.NewGuid()}/audit");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task User_with_read_permission_can_browse_a_page_of_active_records()
    {
        const string userName = "record.list.test";
        const string password = "A-strong-record-list-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.read");
        await SeedRecordAsync(factory, "LIST-001", "First item");
        await SeedRecordAsync(factory, "LIST-002", "Second item");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var defaultResponse = await client.GetAsync("/api/v1/records");

        Assert.Equal(HttpStatusCode.OK, defaultResponse.StatusCode);
        var defaultPage = await defaultResponse.Content.ReadFromJsonAsync<ProductRecordPageResponse>();
        Assert.NotNull(defaultPage);
        Assert.Equal(1, defaultPage.Page);
        Assert.Equal(50, defaultPage.PageSize);
        Assert.Equal(2, defaultPage.TotalCount);
        Assert.Equal(2, defaultPage.Items.Count);

        using var response = await client.GetAsync("/api/v1/records?page=1&pageSize=1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await response.Content.ReadFromJsonAsync<ProductRecordPageResponse>();
        Assert.NotNull(page);
        Assert.Equal(1, page.Page);
        Assert.Equal(1, page.PageSize);
        Assert.Equal(2, page.TotalCount);
        Assert.Single(page.Items);
    }

    [Fact]
    public async Task Create_without_create_permission_is_forbidden_and_does_not_persist()
    {
        const string userName = "record.denied.test";
        const string password = "A-strong-record-denied-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var response = await client.PostAsJsonAsync("/api/v1/records", new { itemName = "Must not persist" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(0, await CountRecordsAsync(factory));
        Assert.Equal(0, await CountAuditEventsAsync(factory));
    }

    [Fact]
    public async Task Anonymous_record_routes_return_unauthorized()
    {
        using var factory = new LoginApiFactory();
        using var client = CreateHttpsClient(factory);

        using var listResponse = await client.GetAsync("/api/v1/records");
        using var detailResponse = await client.GetAsync($"/api/v1/records/{Guid.NewGuid()}");
        using var auditResponse = await client.GetAsync($"/api/v1/records/{Guid.NewGuid()}/audit");
        using var createResponse = await client.PostAsJsonAsync("/api/v1/records", new { itemName = "Anonymous" });

        Assert.Equal(HttpStatusCode.Unauthorized, listResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, detailResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, auditResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, createResponse.StatusCode);
        Assert.Equal(0, await CountRecordsAsync(factory));
        Assert.Equal(0, await CountAuditEventsAsync(factory));
    }

    [Fact]
    public async Task Create_without_antiforgery_token_is_rejected_without_persisting()
    {
        const string userName = "record.csrf.test";
        const string password = "A-strong-record-csrf-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.create");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");

        using var response = await client.PostAsJsonAsync("/api/v1/records", new { itemName = "Must not persist" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, await CountRecordsAsync(factory));
        Assert.Equal(0, await CountAuditEventsAsync(factory));
    }

    [Fact]
    public async Task Duplicate_nonempty_m_code_returns_conflict_without_overwriting_the_existing_record()
    {
        const string userName = "record.duplicate.test";
        const string password = "A-strong-record-duplicate-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.create", "records.read");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        var payload = new { mCode = "M-UNIQUE-001", itemName = "Original item" };

        using var firstResponse = await client.PostAsJsonAsync("/api/v1/records", payload);
        using var duplicateResponse = await client.PostAsJsonAsync("/api/v1/records", new { mCode = payload.mCode, itemName = "Replacement item" });

        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
        Assert.Equal(1, await CountRecordsAsync(factory));
        Assert.Equal(1, await CountAuditEventsAsync(factory));
        var location = Assert.IsAssignableFrom<Uri>(firstResponse.Headers.Location);
        using var retrievedResponse = await client.GetAsync(location);
        var retrieved = await retrievedResponse.Content.ReadFromJsonAsync<ProductRecordResponse>();
        Assert.Equal("Original item", retrieved?.ItemName);
    }

    private sealed record LoginRequest(string UserName, string Password);
    private sealed record CsrfTokenResponse(string? RequestToken);
    private sealed record ProductRecordPageResponse(IReadOnlyList<ProductRecordListItem> Items, int Page, int PageSize, int TotalCount);
    private sealed record ProductRecordListItem(Guid Id, string? MCode, string? ItemName, string? CompanyName, string? ProductStatus, DateTimeOffset UpdatedAt);
    private sealed record ProductRecordResponse(Guid Id, string? MCode, string? ItemName, string? CompanyName, string? Note);
    private sealed record ProductRecordAuditResponse(
        Guid EventId,
        Guid? ActorId,
        DateTimeOffset OccurredAt,
        string Action,
        string Target,
        string Outcome,
        string CorrelationId,
        JsonElement Metadata);

    private static async Task<HttpClient> CreateAuthenticatedClientAsync(
        LoginApiFactory factory,
        string userName,
        string password)
    {
        var client = CreateHttpsClient(factory);
        await AddAntiforgeryTokenAsync(client);
        using var login = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(userName, password));
        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);
        await AddAntiforgeryTokenAsync(client);
        return client;
    }

    private static HttpClient CreateHttpsClient(LoginApiFactory factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true,
            BaseAddress = new Uri("https://localhost")
        });

    private static async Task<int> CountRecordsAsync(LoginApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        return await database.ProductRecords.CountAsync();
    }

    private static async Task<int> CountAuditEventsAsync(LoginApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        return await database.AuditEvents.CountAsync();
    }

    private static async Task AddAntiforgeryTokenAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/api/v1/auth/csrf");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<CsrfTokenResponse>();
        Assert.False(string.IsNullOrWhiteSpace(payload?.RequestToken));
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", payload!.RequestToken);
    }

    private static async Task GrantPermissionsAsync(LoginApiFactory factory, string userName, params string[] permissionKeys)
    {
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        var user = await database.Users.SingleAsync(item => item.UserName == userName);
        var role = new ApplicationRole { Id = Guid.NewGuid(), Name = "Record test role", NormalizedName = $"RECORD_TEST_{Guid.NewGuid():N}" };
        database.Roles.Add(role);
        database.UserRoles.Add(new IdentityUserRole<Guid> { UserId = user.Id, RoleId = role.Id });
        database.RolePermissions.AddRange(permissionKeys.Select(key => new RolePermission(role.Id, key)));
        await database.SaveChangesAsync();
    }

    private static async Task<Guid> SeedRecordAsync(LoginApiFactory factory, string mCode, string itemName)
    {
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        var record = new ProductRecord { MCode = mCode, ItemName = itemName };
        database.ProductRecords.Add(record);
        await database.SaveChangesAsync();
        return record.Id;
    }
}
