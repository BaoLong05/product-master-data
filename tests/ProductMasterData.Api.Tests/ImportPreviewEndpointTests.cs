using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProductMasterData.Domain.Identity;
using ProductMasterData.Infrastructure.Identity;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Tests;

public sealed class ImportPreviewEndpointTests
{
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
            },
            sheet =>
            {
                Assert.Equal("Other", sheet.Name);
                Assert.Equal(["Date", "Note"], sheet.Headers);
            });
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.Equal(0, await database.ProductRecords.CountAsync());
        Assert.Equal(0, await database.AuditEvents.CountAsync());
    }

    private sealed record ImportPreviewResponse(IReadOnlyList<WorksheetPreview> Worksheets);
    private sealed record WorksheetPreview(string Name, IReadOnlyList<string?> Headers);
    private sealed record ImportPreviewErrorResponse(string Code, string Message);
    private sealed record CsrfTokenResponse(string? RequestToken);
    private sealed record LoginRequest(string UserName, string Password);

    private static byte[] CreateWorkbook(params (string Name, string[] Headers, int TrailingRows)[] sheets)
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
                    $"<row r=\"{row}\"><c r=\"A{row}\"><v>1</v></c></row>"));
                WriteEntry(archive, $"xl/worksheets/sheet{index + 1}.xml", $"""
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">{cells}</row>{trailingRows}</sheetData></worksheet>
                    """);
            }
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
