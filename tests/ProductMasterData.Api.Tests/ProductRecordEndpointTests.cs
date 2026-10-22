using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
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
    public async Task Global_search_matches_all_source_fields_and_paginates_filtered_results()
    {
        const string userName = "record.search.test";
        const string password = "A-strong-record-search-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.read");
        var matchId = await SeedRecordAsync(factory, "SEARCH-001", "First result");
        var secondMatchId = await SeedRecordAsync(factory, "SEARCH-002", "Second result");
        await SeedRecordAsync(factory, "SEARCH-003", "No matching result");
        using (var scope = factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
            var record = await database.ProductRecords.SingleAsync(item => item.Id == matchId);
            record.Note = "needle-in-a-source-field";
            var secondRecord = await database.ProductRecords.SingleAsync(item => item.Id == secondMatchId);
            secondRecord.Note = "needle-in-another-source-field";
            await database.SaveChangesAsync();
        }
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var response = await client.GetAsync("/api/v1/records?q=NEEDLE&page=1&pageSize=1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await response.Content.ReadFromJsonAsync<ProductRecordPageResponse>();
        Assert.NotNull(page);
        Assert.Equal(2, page.TotalCount);
        Assert.Single(page.Items);
    }

    [Fact]
    public async Task Field_filter_matches_partial_value_case_insensitively_and_rejects_unknown_filter()
    {
        const string userName = "record.filter.test";
        const string password = "A-strong-record-filter-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.read");
        var matchId = await SeedRecordAsync(factory, "FILTER-001", "First result");
        await SeedRecordAsync(factory, "FILTER-002", "Second result");
        using (var scope = factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
            var record = await database.ProductRecords.SingleAsync(item => item.Id == matchId);
            record.Note = "Exact-Filter-Value";
            await database.SaveChangesAsync();
        }
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var filtered = await client.GetAsync("/api/v1/records?note=exact-filter");
        var page = await filtered.Content.ReadFromJsonAsync<ProductRecordPageResponse>();
        using var combined = await client.GetAsync("/api/v1/records?q=FILTER&note=exact-filter");
        var combinedPage = await combined.Content.ReadFromJsonAsync<ProductRecordPageResponse>();
        using var unknown = await client.GetAsync("/api/v1/records?unknownField=value");
        using var repeated = await client.GetAsync("/api/v1/records?note=one&note=two");

        Assert.Equal(HttpStatusCode.OK, filtered.StatusCode);
        Assert.Equal(1, page?.TotalCount);
        Assert.Equal(matchId, page?.Items.Single().Id);
        Assert.Equal(1, combinedPage?.TotalCount);
        Assert.Equal(HttpStatusCode.BadRequest, unknown.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, repeated.StatusCode);
    }

    [Fact]
    public async Task Global_search_and_field_filters_cover_all_source_fields()
    {
        const string userName = "record.all-fields.test";
        const string password = "A-strong-record-all-fields-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.read");
        var sourceProperties = typeof(ProductRecord).GetProperties()
            .Where(property => property.PropertyType == typeof(string))
            .OrderBy(property => property.Name)
            .ToArray();
        Assert.Equal(27, sourceProperties.Length);

        var recordIds = new List<Guid>();
        using (var scope = factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
            for (var index = 0; index < sourceProperties.Length; index++)
            {
                var recordId = await SeedRecordAsync(factory, $"ALL-FIELDS-{index:00}", $"Ordinary {index}");
                recordIds.Add(recordId);
                var record = await database.ProductRecords.SingleAsync(item => item.Id == recordId);
                sourceProperties[index].SetValue(record, $"search-marker-{index:00}");
            }

            await database.SaveChangesAsync();
        }

        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        for (var index = 0; index < sourceProperties.Length; index++)
        {
            var property = sourceProperties[index];
            var marker = $"SEARCH-MARKER-{index:00}";
            var queryName = JsonNamingPolicy.CamelCase.ConvertName(property.Name);
            using var search = await client.GetAsync($"/api/v1/records?q={marker}");
            using var filter = await client.GetAsync($"/api/v1/records?{queryName}={marker}");
            var searchPage = await search.Content.ReadFromJsonAsync<ProductRecordPageResponse>();
            var filterPage = await filter.Content.ReadFromJsonAsync<ProductRecordPageResponse>();

            Assert.Equal(HttpStatusCode.OK, search.StatusCode);
            Assert.Equal(HttpStatusCode.OK, filter.StatusCode);
            Assert.Equal(recordIds[index], Assert.Single(searchPage!.Items).Id);
            Assert.Equal(recordIds[index], Assert.Single(filterPage!.Items).Id);
        }
    }

    [SearchPostgresFact]
    public async Task PostgreSql_translates_global_search_and_combined_field_filters()
    {
        var connection = new NpgsqlConnectionStringBuilder(
            Environment.GetEnvironmentVariable("PRODUCTMASTERDATA_TEST_SEARCH_POSTGRES"));
        Assert.Equal("search_test", connection.Database);
        Assert.Equal("127.0.0.1", connection.Host);
        using var factory = new LoginApiFactory(postgresConnectionString: connection.ConnectionString);
        const string userName = "record.postgres-search.test";
        const string password = "A-strong-record-postgres-search-passphrase-2026";
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.read");
        var marker = $"postgres-marker-{Guid.NewGuid():N}";
        var recordId = await SeedRecordAsync(factory, $"PG-SEARCH-{Guid.NewGuid():N}", "PostgreSQL search");
        using (var scope = factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
            var record = await database.ProductRecords.SingleAsync(item => item.Id == recordId);
            record.Note = marker;
            record.Region = "North region";
            await database.SaveChangesAsync();
        }

        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var response = await client.GetAsync(
            $"/api/v1/records?q={marker.ToUpperInvariant()}&note=marker&region=NORTH&page=1&pageSize=1");
        var page = await response.Content.ReadFromJsonAsync<ProductRecordPageResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, page?.TotalCount);
        Assert.Equal(recordId, page?.Items.Single().Id);
    }

    [Fact]
    public async Task User_with_update_permission_can_replace_a_record_and_audit_the_change()
    {
        const string userName = "record.update.test";
        const string password = "A-strong-record-update-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.update");
        var recordId = await SeedRecordAsync(factory, "UPDATE-001", "Before edit");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var response = await client.PutAsJsonAsync($"/api/v1/records/{recordId}", new
        {
            version = 1,
            mCode = "UPDATE-001",
            itemName = "After edit",
            note = "private source value"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<ProductRecordResponse>();
        Assert.Equal("After edit", updated?.ItemName);
        Assert.Equal(2, updated?.Version);
        Assert.Equal(1, await CountAuditEventsAsync(factory));
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        var auditEvent = await database.AuditEvents.SingleAsync();
        Assert.Equal("records.updated", auditEvent.Action);
        Assert.DoesNotContain("private source value", auditEvent.MetadataJson, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Update_without_update_permission_is_forbidden_and_does_not_persist()
    {
        const string userName = "record.update.denied.test";
        const string password = "A-strong-record-update-denied-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        var recordId = await SeedRecordAsync(factory, "UPDATE-DENIED-001", "Keep this value");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var response = await client.PutAsJsonAsync($"/api/v1/records/{recordId}", new
        {
            version = 1,
            mCode = "UPDATE-DENIED-001",
            itemName = "Must not persist"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(0, await CountAuditEventsAsync(factory));
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.Equal("Keep this value", (await database.ProductRecords.SingleAsync(item => item.Id == recordId)).ItemName);
    }

    [Fact]
    public async Task Update_with_stale_version_is_conflict_without_a_second_audit_event()
    {
        const string userName = "record.update.stale.test";
        const string password = "A-strong-record-update-stale-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.update");
        var recordId = await SeedRecordAsync(factory, "UPDATE-STALE-001", "Original");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var firstResponse = await client.PutAsJsonAsync($"/api/v1/records/{recordId}", new
        {
            version = 1,
            mCode = "UPDATE-STALE-001",
            itemName = "First edit"
        });
        using var staleResponse = await client.PutAsJsonAsync($"/api/v1/records/{recordId}", new
        {
            version = 1,
            mCode = "UPDATE-STALE-001",
            itemName = "Stale overwrite"
        });

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, staleResponse.StatusCode);
        Assert.Equal(1, await CountAuditEventsAsync(factory));
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.Equal("First edit", (await database.ProductRecords.SingleAsync(item => item.Id == recordId)).ItemName);
    }

    [Fact]
    public async Task Update_with_duplicate_m_code_is_conflict_without_changing_the_record_or_audit()
    {
        const string userName = "record.update.duplicate.test";
        const string password = "A-strong-record-update-duplicate-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.update");
        var recordId = await SeedRecordAsync(factory, "UPDATE-UNIQUE-001", "Original item");
        await SeedRecordAsync(factory, "UPDATE-TAKEN-001", "Other item");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var response = await client.PutAsJsonAsync($"/api/v1/records/{recordId}", new
        {
            version = 1,
            mCode = "UPDATE-TAKEN-001",
            itemName = "Must not persist"
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(0, await CountAuditEventsAsync(factory));
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.Equal("Original item", (await database.ProductRecords.SingleAsync(item => item.Id == recordId)).ItemName);
    }

    [Fact]
    public async Task User_with_delete_permission_can_soft_delete_a_record_with_an_audit_event()
    {
        const string userName = "record.delete.test";
        const string password = "A-strong-record-delete-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.delete", "records.read");
        var recordId = await SeedRecordAsync(factory, "DELETE-001", "Retained source value");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var response = await client.DeleteAsync($"/api/v1/records/{recordId}?version=1");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(1, await CountRecordsAsync(factory));
        Assert.Equal(1, await CountAuditEventsAsync(factory));
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        var retained = await database.ProductRecords.SingleAsync(item => item.Id == recordId);
        Assert.True(retained.IsDeleted);
        Assert.Equal("Retained source value", retained.ItemName);
        Assert.Equal(2, retained.Version);
        var auditEvent = await database.AuditEvents.SingleAsync();
        Assert.Equal("records.deleted", auditEvent.Action);
        Assert.DoesNotContain("Retained source value", auditEvent.MetadataJson, StringComparison.Ordinal);
        using var repeatedDelete = await client.DeleteAsync($"/api/v1/records/{recordId}?version=2");
        Assert.Equal(HttpStatusCode.NotFound, repeatedDelete.StatusCode);
        Assert.Equal(1, await CountAuditEventsAsync(factory));
        using var detail = await client.GetAsync($"/api/v1/records/{recordId}");
        Assert.Equal(HttpStatusCode.NotFound, detail.StatusCode);
        using var list = await client.GetAsync("/api/v1/records");
        var page = await list.Content.ReadFromJsonAsync<ProductRecordPageResponse>();
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        Assert.Empty(page!.Items);
    }

    [Fact]
    public async Task Delete_without_delete_permission_is_forbidden_and_does_not_persist()
    {
        const string userName = "record.delete.denied.test";
        const string password = "A-strong-record-delete-denied-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        var recordId = await SeedRecordAsync(factory, "DELETE-DENIED-001", "Keep this value");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var response = await client.DeleteAsync($"/api/v1/records/{recordId}?version=1");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(0, await CountAuditEventsAsync(factory));
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.False((await database.ProductRecords.SingleAsync(item => item.Id == recordId)).IsDeleted);
    }

    [Fact]
    public async Task Delete_without_antiforgery_token_is_rejected_without_persisting()
    {
        const string userName = "record.delete.csrf.test";
        const string password = "A-strong-record-delete-csrf-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.delete");
        var recordId = await SeedRecordAsync(factory, "DELETE-CSRF-001", "Keep this value");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");

        using var response = await client.DeleteAsync($"/api/v1/records/{recordId}?version=1");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, await CountAuditEventsAsync(factory));
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.False((await database.ProductRecords.SingleAsync(item => item.Id == recordId)).IsDeleted);
    }

    [Fact]
    public async Task Delete_with_stale_version_is_conflict_and_preserves_record()
    {
        const string userName = "record.delete.stale.test";
        const string password = "A-strong-record-delete-stale-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.update", "records.delete");
        var recordId = await SeedRecordAsync(factory, "DELETE-STALE-001", "Original value");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);

        using var update = await client.PutAsJsonAsync($"/api/v1/records/{recordId}", new
        {
            version = 1,
            mCode = "DELETE-STALE-001",
            itemName = "Updated value"
        });
        using var staleDelete = await client.DeleteAsync($"/api/v1/records/{recordId}?version=1");

        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, staleDelete.StatusCode);
        Assert.Equal(1, await CountAuditEventsAsync(factory));
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        var retained = await database.ProductRecords.SingleAsync(item => item.Id == recordId);
        Assert.False(retained.IsDeleted);
        Assert.Equal("Updated value", retained.ItemName);
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
        using var updateResponse = await client.PutAsJsonAsync($"/api/v1/records/{Guid.NewGuid()}", new { version = 1, itemName = "Anonymous" });
        using var deleteResponse = await client.DeleteAsync($"/api/v1/records/{Guid.NewGuid()}?version=1");

        Assert.Equal(HttpStatusCode.Unauthorized, listResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, detailResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, auditResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, deleteResponse.StatusCode);
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
    private sealed record ProductRecordResponse(Guid Id, string? MCode, string? ItemName, string? CompanyName, string? Note, long Version);
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

public sealed class SearchPostgresFactAttribute : FactAttribute
{
    public SearchPostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PRODUCTMASTERDATA_TEST_SEARCH_POSTGRES")))
        {
            Skip = "Set PRODUCTMASTERDATA_TEST_SEARCH_POSTGRES to a dedicated disposable PostgreSQL search_test database to run this provider test.";
        }
    }
}
