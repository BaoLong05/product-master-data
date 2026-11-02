using System.Globalization;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductMasterData.Api.Catalog;
using ProductMasterData.Api.Identity;
using ProductMasterData.Application.Imports;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Imports;

public static class ImportValidationEndpoints
{
    private const long MaximumWorkbookBytes = 10 * 1024 * 1024;
    private const long MaximumRequestBytes = MaximumWorkbookBytes + 64 * 1024;
    private const int MaximumMCodeColumnNumber = 100;

    public static IEndpointRouteBuilder MapImportValidationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/v1/imports/validate", ValidateAsync)
            .WithTags("Imports")
            .RequireAuthorization(
                PermissionPolicies.For("imports.preview"),
                PermissionPolicies.For("records.read"))
            .DisableAntiforgery()
            .WithMetadata(
                new RequestSizeLimitAttribute(MaximumRequestBytes),
                new RequestFormLimitsAttribute { MultipartBodyLengthLimit = MaximumWorkbookBytes, ValueLengthLimit = 128 });
        return endpoints;
    }

    private static async Task<IResult> ValidateAsync(
        IFormFile? file,
        [FromForm] string? worksheetName,
        [FromForm] string? mCodeColumnNumber,
        IAntiforgery antiforgery,
        IWorkbookMCodeScanner scanner,
        ProductMasterDataDbContext database,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        if (!await antiforgery.IsRequestValidAsync(httpContext))
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_antiforgery_token", "A valid antiforgery token is required."));
        }

        if (file is null || file.Length == 0)
        {
            return Results.BadRequest(new ApiErrorResponse("missing_workbook", "Choose a non-empty .xlsx workbook."));
        }

        if (file.Length > MaximumWorkbookBytes)
        {
            return Results.BadRequest(new ApiErrorResponse("workbook_too_large", "The workbook must not exceed 10 MiB."));
        }

        if (!string.Equals(Path.GetExtension(file.FileName), ".xlsx", StringComparison.OrdinalIgnoreCase))
        {
            return Results.BadRequest(new ApiErrorResponse("unsupported_workbook_type", "Only .xlsx workbooks are supported."));
        }

        if (string.IsNullOrWhiteSpace(worksheetName))
        {
            return Results.BadRequest(new ApiErrorResponse("missing_worksheet", "Select an exact worksheet name."));
        }

        if (!int.TryParse(mCodeColumnNumber, NumberStyles.None, CultureInfo.InvariantCulture, out var selectedColumn)
            || selectedColumn is < 1 or > MaximumMCodeColumnNumber)
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_m_code_column", "Select a valid one-based source column for M.CODE."));
        }

        await using var stream = file.OpenReadStream();
        using var buffer = new MemoryStream((int)file.Length);
        await stream.CopyToAsync(buffer, cancellationToken);
        if (buffer.Length > MaximumWorkbookBytes)
        {
            return Results.BadRequest(new ApiErrorResponse("workbook_too_large", "The workbook must not exceed 10 MiB."));
        }

        try
        {
            var scan = scanner.ScanMCode(
                buffer.GetBuffer().AsMemory(0, (int)buffer.Length),
                worksheetName,
                selectedColumn,
                cancellationToken);
            var codes = scan.Values
                .Select(value => value.Value)
                .Distinct(StringComparer.Ordinal)
                .ToArray();
            var existingCodes = new HashSet<string>(StringComparer.Ordinal);
            if (codes.Length > 0)
            {
                var persistedCodes = await database.ProductRecords
                    .AsNoTracking()
                    .Where(record => codes.Contains(record.MCode!))
                    .Select(record => record.MCode!)
                    .ToListAsync(cancellationToken);
                existingCodes.UnionWith(persistedCodes);
            }

            var repeatedCodes = scan.Values
                .GroupBy(value => value.Value, StringComparer.Ordinal)
                .Where(group => group.Count() > 1)
                .Select(group => group.Key)
                .ToHashSet(StringComparer.Ordinal);
            var issues = scan.Values
                .Where(value => existingCodes.Contains(value.Value) || repeatedCodes.Contains(value.Value))
                .Select(value => new ImportMCodeValidationIssue(value.RowNumber, "duplicate_m_code"))
                .OrderBy(issue => issue.RowNumber)
                .ToArray();

            return Results.Ok(new ImportMCodeValidationResponse(
                scan.WorksheetName,
                scan.ScannedRows,
                issues.Length,
                issues));
        }
        catch (InvalidMCodeColumnException)
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_m_code_column", "The selected M.CODE column is not present in the worksheet header."));
        }
        catch (WorkbookRowLimitExceededException)
        {
            return Results.BadRequest(new ApiErrorResponse("workbook_row_limit_exceeded", "The worksheet exceeds the 10,000 data-row validation limit."));
        }
        catch (InvalidWorkbookException exception)
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_workbook", exception.Message));
        }
    }
}

public sealed record ImportMCodeValidationResponse(
    string WorksheetName,
    int ScannedRows,
    int DuplicateRows,
    IReadOnlyList<ImportMCodeValidationIssue> Issues);

public sealed record ImportMCodeValidationIssue(int RowNumber, string Code);
