using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProductMasterData.Application.Imports;
using ProductMasterData.Domain.Catalog;
using ProductMasterData.Domain.Identity;
using ProductMasterData.Infrastructure.Identity;
using ProductMasterData.Infrastructure.Imports;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Tests;

public sealed class ImportPreviewEndpointTests
{
    [Fact]
    public void Workbook_m_code_scanner_propagates_request_cancellation()
    {
        var scanner = new OpenXmlWorkbookPreviewReader();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        Assert.Throws<OperationCanceledException>(() => scanner.ScanMCode(
            CreateWorkbook(("DATA", ["M.CODE"], 1)),
            "DATA",
            1,
            cancellation.Token));
    }

    [Fact]
    public void Workbook_m_code_scanner_rejects_sparse_rows_beyond_physical_row_limit()
    {
        var scanner = new OpenXmlWorkbookPreviewReader();

        Assert.Throws<WorkbookRowLimitExceededException>(() => scanner.ScanMCode(
            CreateWorkbookWithSparseMCodeRow(10_002),
            "DATA",
            1,
            CancellationToken.None));
    }

    [Fact]
    public void Workbook_m_code_scanner_counts_sparse_physical_rows_at_the_limit()
    {
        var scanner = new OpenXmlWorkbookPreviewReader();

        var scan = scanner.ScanMCode(
            CreateWorkbookWithSparseMCodeRow(10_001),
            "DATA",
            1,
            CancellationToken.None);

        Assert.Equal(10_000, scan.ScannedRows);
        Assert.Equal(10_001, Assert.Single(scan.Values).RowNumber);
    }

    [Fact]
    public void Workbook_m_code_scanner_rejects_a_cell_reference_for_a_different_row()
    {
        var scanner = new OpenXmlWorkbookPreviewReader();

        Assert.Throws<InvalidWorkbookException>(() => scanner.ScanMCode(
            CreateWorkbookWithSparseMCodeRow(2, 3),
            "DATA",
            1,
            CancellationToken.None));
    }

    [Fact]
    public void Workbook_m_code_scanner_rejects_row_numbers_outside_excel_limits()
    {
        var scanner = new OpenXmlWorkbookPreviewReader();

        Assert.Throws<InvalidWorkbookException>(() => scanner.ScanMCode(
            CreateWorkbookWithSparseMCodeRow(1_048_577),
            "DATA",
            1,
            CancellationToken.None));
    }

    [Fact]
    public async Task Anonymous_user_cannot_preview_a_workbook()
    {
        using var factory = new LoginApiFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("https://localhost")
        });
        using var content = new MultipartFormDataContent();

        using var response = await client.PostAsync("/api/v1/imports/preview", content);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Authenticated_user_without_import_preview_permission_is_forbidden()
    {
        const string userName = "import.preview.denied.test";
        const string password = "A-strong-import-preview-denied-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();

        using var response = await client.PostAsync("/api/v1/imports/preview", content);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.Equal(0, await database.ProductRecords.CountAsync());
    }

    [Fact]
    public async Task Workbook_preview_requires_a_valid_antiforgery_token_before_processing()
    {
        const string userName = "import.preview.csrf.test";
        const string password = "A-strong-import-preview-csrf-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        using var content = new MultipartFormDataContent();

        using var response = await client.PostAsync("/api/v1/imports/preview", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.Equal(0, await database.ProductRecords.CountAsync());
    }

    [Fact]
    public async Task Workbook_preview_rejects_legacy_excel_extensions()
    {
        const string userName = "import.preview.legacy.test";
        const string password = "A-strong-import-preview-legacy-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent([1, 2, 3]), "file", "products.xls");

        using var response = await client.PostAsync("/api/v1/imports/preview", content);
        var error = await response.Content.ReadFromJsonAsync<ImportPreviewErrorResponse>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("unsupported_workbook_type", error?.Code);
    }

    [Fact]
    public async Task Workbook_preview_rejects_an_empty_file()
    {
        const string userName = "import.preview.empty.test";
        const string password = "A-strong-import-preview-empty-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent([]), "file", "products.xlsx");

        using var response = await client.PostAsync("/api/v1/imports/preview", content);
        var error = await response.Content.ReadFromJsonAsync<ImportPreviewErrorResponse>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("missing_workbook", error?.Code);
    }

    [Fact]
    public async Task Workbook_preview_enforces_the_upload_size_limit()
    {
        const string userName = "import.preview.oversized.test";
        const string password = "A-strong-import-preview-oversized-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(new byte[10 * 1024 * 1024 + 1]), "file", "products.xlsx");

        using var response = await client.PostAsync("/api/v1/imports/preview", content);

        Assert.True(response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.RequestEntityTooLarge,
            $"Expected upload rejection, got {(int)response.StatusCode}.");
    }

    [Fact]
    public async Task Workbook_preview_rejects_malformed_xlsx_without_persisting_records()
    {
        const string userName = "import.preview.invalid.test";
        const string password = "A-strong-import-preview-invalid-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent([1, 2, 3]), "file", "products.xlsx");

        using var response = await client.PostAsync("/api/v1/imports/preview", content);
        var error = await response.Content.ReadFromJsonAsync<ImportPreviewErrorResponse>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_workbook", error?.Code);
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.Equal(0, await database.ProductRecords.CountAsync());
    }

    [Fact]
    public async Task Workbook_preview_reads_headers_without_loading_all_data_rows()
    {
        const string userName = "import.preview.large-sheet.test";
        const string password = "A-strong-import-preview-large-sheet-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        using var workbook = new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE", "Item Name"], 45_000)));
        content.Add(workbook, "file", "products.xlsx");

        using var response = await client.PostAsync("/api/v1/imports/preview", content);
        var preview = await response.Content.ReadFromJsonAsync<ImportPreviewResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["M.CODE", "Item Name"], Assert.Single(preview!.Worksheets).Headers);
    }

    [Fact]
    public async Task Selected_sheet_returns_only_ten_raw_rows_and_omits_formula_values()
    {
        const string userName = "import.preview.rows.test";
        const string password = "A-strong-import-preview-rows-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        using var workbook = new ByteArrayContent(CreateWorkbookWithFormulaRow());
        content.Add(workbook, "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");

        using var response = await client.PostAsync("/api/v1/imports/preview", content);
        var responseBody = await response.Content.ReadAsStringAsync();
        var preview = JsonSerializer.Deserialize<ImportPreviewResponse>(responseBody, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var sheet = Assert.Single(preview!.Worksheets);
        Assert.Equal("DATA", sheet.Name);
        Assert.Equal(["M.CODE", "Item Name"], sheet.Headers);
        Assert.Equal(10, sheet.Rows!.Count);
        Assert.Equal(Enumerable.Range(2, 10), sheet.Rows.Select(row => row.RowNumber));
        Assert.Equal("1", sheet.Rows[0].Values[0]);
        Assert.Null(sheet.Rows[0].Values[1]);
        Assert.Equal([2], sheet.Rows[0].FormulaColumns);
        Assert.DoesNotContain("HYPERLINK", responseBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("cached-secret", responseBody, StringComparison.OrdinalIgnoreCase);
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.Equal(0, await database.ProductRecords.CountAsync());
        Assert.Equal(0, await database.AuditEvents.CountAsync());
    }

    [Fact]
    public async Task Unknown_selected_sheet_returns_a_safe_client_error()
    {
        const string userName = "import.preview.unknown-sheet.test";
        const string password = "A-strong-import-preview-unknown-sheet-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        using var workbook = new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE"], 0), ("ARCHIVE", ["M.CODE"], 0)));
        content.Add(workbook, "file", "products.xlsx");
        content.Add(new StringContent("MISSING"), "worksheetName");

        using var response = await client.PostAsync("/api/v1/imports/preview", content);
        var error = await response.Content.ReadFromJsonAsync<ImportPreviewErrorResponse>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_workbook", error?.Code);
    }

    [Fact]
    public async Task Import_operator_can_inspect_workbook_headers_without_writing_business_data()
    {
        const string userName = "import.preview.test";
        const string password = "A-strong-import-preview-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        using var workbook = new ByteArrayContent(CreateWorkbook(
            ("DATA", ["M.CODE", "Item Name"], 0),
            ("Other", ["Date", "Note"], 0)));
        workbook.Headers.ContentType = new MediaTypeHeaderValue("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        content.Add(workbook, "file", "products.xlsx");

        using var response = await client.PostAsync("/api/v1/imports/preview", content);
        var preview = await response.Content.ReadFromJsonAsync<ImportPreviewResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(preview);
        Assert.Collection(preview.Worksheets,
            sheet =>
            {
                Assert.Equal("DATA", sheet.Name);
                Assert.Equal(["M.CODE", "Item Name"], sheet.Headers);
                Assert.Null(sheet.Rows);
            },
            sheet =>
            {
                Assert.Equal("Other", sheet.Name);
                Assert.Equal(["Date", "Note"], sheet.Headers);
                Assert.Null(sheet.Rows);
            });
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.Equal(0, await database.ProductRecords.CountAsync());
        Assert.Equal(0, await database.AuditEvents.CountAsync());
    }

    [Fact]
    public async Task Duplicate_m_codes_in_workbook_return_exact_source_rows_without_echoing_keys()
    {
        const string userName = "import.validate.duplicate.test";
        const string password = "A-strong-import-validate-duplicate-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview", "records.read");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE"], 2))), "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");
        content.Add(new StringContent("1"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);
        var json = await response.Content.ReadAsStringAsync();
        var validation = JsonSerializer.Deserialize<ImportValidationResponse>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(validation);
        Assert.Equal("DATA", validation.WorksheetName);
        Assert.Equal(2, validation.ScannedRows);
        Assert.Equal(2, validation.DuplicateRows);
        Assert.Collection(validation.Issues,
            issue =>
            {
                Assert.Equal(2, issue.RowNumber);
                Assert.Equal("duplicate_m_code", issue.Code);
            },
            issue =>
            {
                Assert.Equal(3, issue.RowNumber);
                Assert.Equal("duplicate_m_code", issue.Code);
            });
        using (var document = JsonDocument.Parse(json))
        {
            var issuePropertyNames = document.RootElement
                .GetProperty("issues")
                .EnumerateArray()
                .SelectMany(issue => issue.EnumerateObject().Select(property => property.Name))
                .Distinct(StringComparer.Ordinal)
                .OrderBy(name => name, StringComparer.Ordinal)
                .ToArray();
            Assert.Equal(new[] { "code", "rowNumber" }, issuePropertyNames);
        }

        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.Equal(0, await database.ProductRecords.CountAsync());
        Assert.Equal(0, await database.AuditEvents.CountAsync());
    }

    [Fact]
    public async Task Anonymous_user_cannot_validate_a_workbook()
    {
        using var factory = new LoginApiFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("https://localhost")
        });
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE"], 1))), "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");
        content.Add(new StringContent("1"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task M_code_matching_an_existing_record_is_reported_without_echoing_the_key()
    {
        const string userName = "import.validate.existing.test";
        const string password = "A-strong-import-validate-existing-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview", "records.read");
        using (var scope = factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
            database.ProductRecords.Add(new ProductRecord { MCode = "1" });
            await database.SaveChangesAsync();
        }

        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE"], 1))), "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");
        content.Add(new StringContent("1"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);
        var validation = await response.Content.ReadFromJsonAsync<ImportValidationResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(validation);
        Assert.Equal(1, validation.ScannedRows);
        Assert.Equal(1, validation.DuplicateRows);
        var issue = Assert.Single(validation.Issues);
        Assert.Equal(2, issue.RowNumber);
        Assert.Equal("duplicate_m_code", issue.Code);
    }

    [Fact]
    public async Task M_code_matching_a_soft_deleted_record_is_reported()
    {
        const string userName = "import.validate.soft-deleted.test";
        const string password = "A-strong-import-validate-soft-deleted-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview", "records.read");
        using (var scope = factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
            var existing = new ProductRecord { MCode = "1" };
            existing.SoftDelete();
            database.ProductRecords.Add(existing);
            await database.SaveChangesAsync();
        }

        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE"], 1))), "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");
        content.Add(new StringContent("1"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);
        var validation = await response.Content.ReadFromJsonAsync<ImportValidationResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(validation);
        Assert.Equal(1, validation.DuplicateRows);
        Assert.Equal(2, Assert.Single(validation.Issues).RowNumber);
    }

    [Fact]
    public async Task M_code_shared_strings_are_compared_exactly_without_normalization()
    {
        const string userName = "import.validate.exact-string.test";
        const string password = "A-strong-import-validate-exact-string-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview", "records.read");
        using (var scope = factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
            database.ProductRecords.Add(new ProductRecord { MCode = "KEY-A" });
            await database.SaveChangesAsync();
        }

        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(CreateWorkbookWithMCodeValues("KEY-A", "key-a", " KEY-A ", "")), "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");
        content.Add(new StringContent("1"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);
        var json = await response.Content.ReadAsStringAsync();
        var validation = JsonSerializer.Deserialize<ImportValidationResponse>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(validation);
        Assert.Equal(4, validation.ScannedRows);
        Assert.Equal(1, validation.DuplicateRows);
        Assert.Equal(2, Assert.Single(validation.Issues).RowNumber);
        Assert.DoesNotContain("KEY-A", json, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Formula_cached_value_is_not_validated_as_m_code()
    {
        const string userName = "import.validate.formula.test";
        const string password = "A-strong-import-validate-formula-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview", "records.read");
        using (var scope = factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
            database.ProductRecords.Add(new ProductRecord { MCode = "cached-secret" });
            await database.SaveChangesAsync();
        }

        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        var workbook = CreateWorkbook([("DATA", ["Other", "M.CODE"], 1)], includeFormulaInFirstSheet: true);
        content.Add(new ByteArrayContent(workbook), "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");
        content.Add(new StringContent("2"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);
        var validation = await response.Content.ReadFromJsonAsync<ImportValidationResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(validation);
        Assert.Equal(1, validation.ScannedRows);
        Assert.Equal(0, validation.DuplicateRows);
    }

    [Fact]
    public async Task Missing_worksheet_selection_is_rejected()
    {
        const string userName = "import.validate.worksheet-required.test";
        const string password = "A-strong-import-validate-worksheet-required-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview", "records.read");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE"], 1))), "file", "products.xlsx");
        content.Add(new StringContent("1"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);
        var error = await response.Content.ReadFromJsonAsync<ImportPreviewErrorResponse>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("missing_worksheet", error?.Code);
    }

    [Fact]
    public async Task M_code_column_mapping_beyond_the_header_is_rejected()
    {
        const string userName = "import.validate.column-range.test";
        const string password = "A-strong-import-validate-column-range-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview", "records.read");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE"], 1))), "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");
        content.Add(new StringContent("2"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);
        var error = await response.Content.ReadFromJsonAsync<ImportPreviewErrorResponse>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_m_code_column", error?.Code);
    }

    [Fact]
    public async Task M_code_validation_requires_import_preview_in_addition_to_records_read()
    {
        const string userName = "import.validate.preview-denied.test";
        const string password = "A-strong-import-validate-preview-denied-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "records.read");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE"], 1))), "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");
        content.Add(new StringContent("1"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task M_code_validation_requires_records_read_in_addition_to_import_preview()
    {
        const string userName = "import.validate.records-read-denied.test";
        const string password = "A-strong-import-validate-records-read-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE"], 1))), "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");
        content.Add(new StringContent("1"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task M_code_validation_rejects_a_missing_antiforgery_token()
    {
        const string userName = "import.validate.csrf.test";
        const string password = "A-strong-import-validate-csrf-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview", "records.read");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE"], 1))), "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");
        content.Add(new StringContent("1"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);
        var error = await response.Content.ReadFromJsonAsync<ImportPreviewErrorResponse>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_antiforgery_token", error?.Code);
    }

    [Fact]
    public async Task Workbook_over_row_limit_is_rejected_without_partial_validation_results()
    {
        const string userName = "import.validate.row-limit.test";
        const string password = "A-strong-import-validate-row-limit-passphrase-2026";
        using var factory = new LoginApiFactory();
        await factory.CreateUserAsync(userName, password);
        await GrantPermissionsAsync(factory, userName, "imports.preview", "records.read");
        using var client = await CreateAuthenticatedClientAsync(factory, userName, password);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(CreateWorkbook(("DATA", ["M.CODE"], 10_001))), "file", "products.xlsx");
        content.Add(new StringContent("DATA"), "worksheetName");
        content.Add(new StringContent("1"), "mCodeColumnNumber");

        using var response = await client.PostAsync("/api/v1/imports/validate", content);
        var error = await response.Content.ReadFromJsonAsync<ImportPreviewErrorResponse>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("workbook_row_limit_exceeded", error?.Code);
    }

    private sealed record ImportPreviewResponse(IReadOnlyList<WorksheetPreview> Worksheets);
    private sealed record WorksheetPreview(string Name, IReadOnlyList<string?> Headers, IReadOnlyList<ImportPreviewRow>? Rows);
    private sealed record ImportPreviewRow(int RowNumber, IReadOnlyList<string?> Values, IReadOnlyList<int> FormulaColumns);
    private sealed record ImportPreviewErrorResponse(string Code, string Message);
    private sealed record ImportValidationResponse(string WorksheetName, int ScannedRows, int DuplicateRows, IReadOnlyList<ImportValidationIssue> Issues);
    private sealed record ImportValidationIssue(int RowNumber, string Code);
    private sealed record CsrfTokenResponse(string? RequestToken);
    private sealed record LoginRequest(string UserName, string Password);

    private static byte[] CreateWorkbookWithFormulaRow()
        => CreateWorkbook(
            [("DATA", ["M.CODE", "Item Name"], 45_000), ("ARCHIVE", ["Legacy"], 0)],
            includeFormulaInFirstSheet: true);

    private static byte[] CreateWorkbook(params (string Name, string[] Headers, int TrailingRows)[] sheets)
        => CreateWorkbook(sheets, includeFormulaInFirstSheet: false);

    private static byte[] CreateWorkbook(
        (string Name, string[] Headers, int TrailingRows)[] sheets,
        bool includeFormulaInFirstSheet)
    {
        using var stream = new MemoryStream();
        var sharedStringValues = sheets.SelectMany(sheet => sheet.Headers).ToArray();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            var worksheetContentTypes = string.Join("", sheets.Select((_, index) =>
                $"<Override PartName=\"/xl/worksheets/sheet{index + 1}.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\" />"));
            var sharedStringItems = string.Join("", sharedStringValues.Select(value =>
                $"<si><t>{System.Security.SecurityElement.Escape(value)}</t></si>"));
            WriteEntry(archive, "[Content_Types].xml", $"""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
                  <Default Extension="xml" ContentType="application/xml" />
                  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" />
                  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml" />
                  {worksheetContentTypes}
                </Types>
                """);
            WriteEntry(archive, "_rels/.rels", """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml" />
                </Relationships>
                """);
            var sheetEntries = string.Join("", sheets.Select((sheet, index) =>
                $"<sheet name=\"{sheet.Name}\" sheetId=\"{index + 1}\" r:id=\"rId{index + 1}\" />"));
            WriteEntry(archive, "xl/workbook.xml", $"""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                  <sheets>{sheetEntries}</sheets>
                </workbook>
                """);
            var relationships = string.Join("", sheets.Select((_, index) =>
                $"<Relationship Id=\"rId{index + 1}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet{index + 1}.xml\" />"))
                + $"<Relationship Id=\"rId{sheets.Length + 1}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings\" Target=\"sharedStrings.xml\" />";
            WriteEntry(archive, "xl/_rels/workbook.xml.rels", $"""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{relationships}</Relationships>
                """);
            WriteEntry(archive, "xl/sharedStrings.xml", $"""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{sharedStringValues.Length}" uniqueCount="{sharedStringValues.Length}">{sharedStringItems}</sst>
                """);
            for (var index = 0; index < sheets.Length; index++)
            {
                var cells = string.Join("", sheets[index].Headers.Select((header, column) =>
                    $"<c r=\"{(char)('A' + column)}1\" t=\"s\"><v>{Array.IndexOf(sharedStringValues, header)}</v></c>"));
                var trailingRows = string.Concat(Enumerable.Range(2, sheets[index].TrailingRows).Select(row =>
                    index == 0 && includeFormulaInFirstSheet && row == 2
                        ? "<row r=\"2\"><c r=\"A2\"><v>1</v></c><c r=\"B2\"><f>HYPERLINK(&quot;https://example.invalid&quot;,&quot;formula-secret&quot;)</f><v>cached-secret</v></c></row>"
                        : $"<row r=\"{row}\"><c r=\"A{row}\"><v>1</v></c></row>"));
                WriteEntry(archive, $"xl/worksheets/sheet{index + 1}.xml", $"""
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">{cells}</row>{trailingRows}</sheetData></worksheet>
                    """);
            }
        }

        return stream.ToArray();
    }

    private static byte[] CreateWorkbookWithMCodeValues(params string?[] mCodeValues)
    {
        var baseWorkbook = CreateWorkbook(("DATA", ["M.CODE"], mCodeValues.Length));
        using var sourceStream = new MemoryStream(baseWorkbook);
        using var sourceArchive = new ZipArchive(sourceStream, ZipArchiveMode.Read, leaveOpen: true);
        using var outputStream = new MemoryStream();
        using (var outputArchive = new ZipArchive(outputStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var entry in sourceArchive.Entries.Where(entry =>
                         entry.FullName is not "xl/sharedStrings.xml" and not "xl/worksheets/sheet1.xml"))
            {
                using var input = entry.Open();
                using var output = outputArchive.CreateEntry(entry.FullName).Open();
                input.CopyTo(output);
            }

            var sharedStringValues = new List<string> { "M.CODE" };
            foreach (var value in mCodeValues.OfType<string>().Distinct(StringComparer.Ordinal))
            {
                if (!sharedStringValues.Contains(value, StringComparer.Ordinal))
                {
                    sharedStringValues.Add(value);
                }
            }

            var sharedStringItems = string.Join("", sharedStringValues.Select(value =>
                $"<si><t xml:space=\"preserve\">{System.Security.SecurityElement.Escape(value)}</t></si>"));
            var sharedStringsXml = $"""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{mCodeValues.Count(value => value is not null) + 1}" uniqueCount="{sharedStringValues.Count}">{sharedStringItems}</sst>
                """;
            WriteEntry(outputArchive, "xl/sharedStrings.xml", sharedStringsXml);

            var dataRows = string.Concat(mCodeValues.Select((value, index) =>
            {
                var row = index + 2;
                return value is null
                    ? $"<row r=\"{row}\" />"
                    : $"<row r=\"{row}\"><c r=\"A{row}\" t=\"s\"><v>{sharedStringValues.IndexOf(value)}</v></c></row>";
            }));
            var worksheetXml = $"""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row>{dataRows}</sheetData></worksheet>
                """;
            WriteEntry(outputArchive, "xl/worksheets/sheet1.xml", worksheetXml);
        }

        return outputStream.ToArray();
    }

    private static byte[] CreateWorkbookWithSparseMCodeRow(int rowNumber, int? cellReferenceRowNumber = null)
    {
        using var stream = new MemoryStream();
        stream.Write(CreateWorkbook(("DATA", ["M.CODE"], 1)));
        stream.Position = 0;
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Update, leaveOpen: true))
        {
            var worksheet = archive.GetEntry("xl/worksheets/sheet1.xml")
                ?? throw new InvalidOperationException("The test workbook is missing its worksheet.");
            string worksheetXml;
            using (var reader = new StreamReader(worksheet.Open()))
            {
                worksheetXml = reader.ReadToEnd();
            }

            worksheet.Delete();
            worksheetXml = worksheetXml
                .Replace("r=\"2\"", $"r=\"{rowNumber}\"", StringComparison.Ordinal)
                .Replace("A2", $"A{cellReferenceRowNumber ?? rowNumber}", StringComparison.Ordinal);
            WriteEntry(archive, "xl/worksheets/sheet1.xml", worksheetXml);
        }

        return stream.ToArray();
    }

    private static void WriteEntry(ZipArchive archive, string name, string content)
    {
        var entry = archive.CreateEntry(name);
        using var writer = new StreamWriter(entry.Open(), Encoding.UTF8);
        writer.Write(content);
    }

    private static async Task<HttpClient> CreateAuthenticatedClientAsync(
        LoginApiFactory factory,
        string userName,
        string password)
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true,
            BaseAddress = new Uri("https://localhost")
        });
        await AddAntiforgeryTokenAsync(client);
        using var login = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(userName, password));
        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);
        await AddAntiforgeryTokenAsync(client);
        return client;
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
        var role = new ApplicationRole { Id = Guid.NewGuid(), Name = "Import test role", NormalizedName = $"IMPORT_TEST_{Guid.NewGuid():N}" };
        database.Roles.Add(role);
        database.UserRoles.Add(new IdentityUserRole<Guid> { UserId = user.Id, RoleId = role.Id });
        database.RolePermissions.AddRange(permissionKeys.Select(key => new RolePermission(role.Id, key)));
        await database.SaveChangesAsync();
    }
}
