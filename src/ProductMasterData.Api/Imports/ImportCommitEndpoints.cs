using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ProductMasterData.Api.Catalog;
using ProductMasterData.Api.Identity;
using ProductMasterData.Application.Imports;
using ProductMasterData.Domain.Audit;
using ProductMasterData.Domain.Catalog;
using ProductMasterData.Domain.Imports;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Imports;

public static class ImportCommitEndpoints
{
    private const long MaximumWorkbookBytes = 10 * 1024 * 1024;
    private const long MaximumRequestBytes = MaximumWorkbookBytes + 64 * 1024;

    private static readonly IReadOnlyDictionary<string, Action<ProductRecord, string?>> FieldSetters =
        new Dictionary<string, Action<ProductRecord, string?>>(StringComparer.Ordinal)
        {
            ["dateValue"] = (record, value) => record.DateValue = value,
            ["companyName"] = (record, value) => record.CompanyName = value,
            ["itemName"] = (record, value) => record.ItemName = value,
            ["mCode"] = (record, value) => record.MCode = value,
            ["itemCode"] = (record, value) => record.ItemCode = value,
            ["productType"] = (record, value) => record.ProductType = value,
            ["productStatus"] = (record, value) => record.ProductStatus = value,
            ["approvalStatus"] = (record, value) => record.ApprovalStatus = value,
            ["sampleOrProductionOrder"] = (record, value) => record.SampleOrProductionOrder = value,
            ["companyNameLetters"] = (record, value) => record.CompanyNameLetters = value,
            ["oldRegion"] = (record, value) => record.OldRegion = value,
            ["sampleSavedDate"] = (record, value) => record.SampleSavedDate = value,
            ["picImage"] = (record, value) => record.PicImage = value,
            ["purchaseOrder"] = (record, value) => record.PurchaseOrder = value,
            ["productionOrderPdf"] = (record, value) => record.ProductionOrderPdf = value,
            ["note"] = (record, value) => record.Note = value,
            ["printedAt"] = (record, value) => record.PrintedAt = value,
            ["discName"] = (record, value) => record.DiscName = value,
            ["soi"] = (record, value) => record.Soi = value,
            ["maso"] = (record, value) => record.Maso = value,
            ["denier"] = (record, value) => record.Denier = value,
            ["price"] = (record, value) => record.Price = value,
            ["region"] = (record, value) => record.Region = value,
            ["quantity"] = (record, value) => record.Quantity = value,
            ["picUrl"] = (record, value) => record.PicUrl = value,
            ["internalItem"] = (record, value) => record.InternalItem = value,
            ["request"] = (record, value) => record.Request = value
        };

    public static IEndpointRouteBuilder MapImportCommitEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/v1/imports/commit", CommitAsync)
            .WithTags("Imports")
            .RequireAuthorization(PermissionPolicies.For("imports.commit"))
            .DisableAntiforgery()
            .WithMetadata(
                new RequestSizeLimitAttribute(MaximumRequestBytes),
                new RequestFormLimitsAttribute { MultipartBodyLengthLimit = MaximumWorkbookBytes, ValueLengthLimit = 4096 });
        return endpoints;
    }

    private static async Task<IResult> CommitAsync(
        IFormFile? file,
        [FromForm] string? worksheetName,
        [FromForm] string? columnMapping,
        IAntiforgery antiforgery,
        IWorkbookImportReader workbookReader,
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

        if (!TryParseMapping(columnMapping, out var mapping, out var mappingError))
        {
            return Results.BadRequest(new ApiErrorResponse(mappingError, "Map at least one source column to a unique product field."));
        }

        if (!Guid.TryParse(httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorId))
        {
            return Results.Unauthorized();
        }

        await using var upload = file.OpenReadStream();
        using var buffer = new MemoryStream((int)file.Length);
        await upload.CopyToAsync(buffer, cancellationToken);
        if (buffer.Length > MaximumWorkbookBytes)
        {
            return Results.BadRequest(new ApiErrorResponse("workbook_too_large", "The workbook must not exceed 10 MiB."));
        }

        WorkbookImportData workbook;
        try
        {
            workbook = workbookReader.ReadRows(
                buffer.GetBuffer().AsMemory(0, (int)buffer.Length),
                worksheetName,
                cancellationToken);
        }
        catch (WorkbookRowLimitExceededException)
        {
            return Results.BadRequest(new ApiErrorResponse("workbook_row_limit_exceeded", "The worksheet exceeds the 10,000 data-row limit."));
        }
        catch (InvalidWorkbookException exception)
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_workbook", exception.Message));
        }

        if (mapping.Keys.Any(column => column > workbook.Headers.Count))
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_column_mapping", "A mapped source column is not present in the worksheet header."));
        }

        var fingerprint = CreateFingerprint(
            buffer.GetBuffer().AsMemory(0, (int)buffer.Length),
            workbook.WorksheetName,
            mapping);
        var previousBatch = await FindBatchAsync(database, actorId, fingerprint, cancellationToken);
        if (previousBatch is not null)
        {
            return Results.Ok(ToResponse(previousBatch, replayed: true));
        }

        var candidateRows = new List<(int RowNumber, ProductRecord Record)>(workbook.Rows.Count);
        foreach (var row in workbook.Rows)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var record = new ProductRecord();
            foreach (var (columnNumber, targetField) in mapping)
            {
                FieldSetters[targetField](record, row.Values[columnNumber - 1]);
            }

            candidateRows.Add((row.RowNumber, record));
        }

        var duplicateCodes = candidateRows
            .Where(row => !string.IsNullOrEmpty(row.Record.MCode))
            .GroupBy(row => row.Record.MCode!, StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToHashSet(StringComparer.Ordinal);
        var mappedCodes = candidateRows
            .Select(row => row.Record.MCode)
            .Where(code => !string.IsNullOrEmpty(code))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        var existingCodes = new HashSet<string>(StringComparer.Ordinal);
        if (mappedCodes.Length > 0)
        {
            var storedCodes = await database.ProductRecords
                .AsNoTracking()
                .Where(record => mappedCodes.Contains(record.MCode!))
                .Select(record => record.MCode!)
                .ToListAsync(cancellationToken);
            existingCodes.UnionWith(storedCodes);
        }

        var issues = candidateRows
            .Where(row => !string.IsNullOrEmpty(row.Record.MCode)
                && (duplicateCodes.Contains(row.Record.MCode!) || existingCodes.Contains(row.Record.MCode!)))
            .Select(row => ImportRowIssue.Create(Guid.Empty, row.RowNumber, "duplicate_m_code"))
            .ToArray();
        var skippedRowNumbers = issues.Select(issue => issue.RowNumber).ToHashSet();
        var rowsToImport = candidateRows
            .Where(row => !skippedRowNumbers.Contains(row.RowNumber))
            .Select(row => row.Record)
            .ToArray();
        var batch = ImportBatch.Create(
            actorId,
            SafeFileName(file.FileName),
            fingerprint,
            workbook.Rows.Count,
            rowsToImport.Length,
            issues.Length);
        foreach (var issue in issues)
        {
            var persistedIssue = ImportRowIssue.Create(batch.Id, issue.RowNumber, issue.Code);
            batch.Issues.Add(persistedIssue);
            database.ImportRowIssues.Add(persistedIssue);
        }

        database.ProductRecords.AddRange(rowsToImport);
        database.ImportBatches.Add(batch);
        database.AuditEvents.Add(AuditEvent.Create(
            actorId,
            "imports.committed",
            $"import_batch:{batch.Id:D}",
            "succeeded",
            httpContext.TraceIdentifier,
            JsonSerializer.Serialize(new
            {
                batchId = batch.Id,
                scannedRows = batch.ScannedRows,
                importedRows = batch.ImportedRows,
                skippedRows = batch.SkippedRows
            })));

        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception, "ux_import_batches_actor_fingerprint"))
        {
            database.ChangeTracker.Clear();
            var concurrentBatch = await FindBatchAsync(database, actorId, fingerprint, cancellationToken);
            return concurrentBatch is null
                ? Results.Conflict(new ApiErrorResponse("import_commit_conflict", "The import could not be completed safely. Retry the same file."))
                : Results.Ok(ToResponse(concurrentBatch, replayed: true));
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception, "ux_product_records_m_code_non_empty"))
        {
            return Results.Conflict(new ApiErrorResponse("import_duplicate_conflict", "A record with one of these M.CODE values was created concurrently. No rows were imported; retry to review duplicates."));
        }

        return Results.Created($"/api/v1/imports/history/{batch.Id:D}", ToResponse(batch, replayed: false));
    }

    private static bool TryParseMapping(
        string? json,
        out Dictionary<int, string> mapping,
        out string errorCode)
    {
        mapping = new Dictionary<int, string>();
        errorCode = "invalid_column_mapping";
        if (string.IsNullOrWhiteSpace(json))
        {
            errorCode = "missing_column_mapping";
            return false;
        }

        try
        {
            using var document = JsonDocument.Parse(json, new JsonDocumentOptions { MaxDepth = 2 });
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            var targets = new HashSet<string>(StringComparer.Ordinal);
            foreach (var property in document.RootElement.EnumerateObject())
            {
                if (!int.TryParse(property.Name, NumberStyles.None, CultureInfo.InvariantCulture, out var columnNumber)
                    || columnNumber < 1
                    || property.Value.ValueKind != JsonValueKind.String)
                {
                    return false;
                }

                var targetField = property.Value.GetString();
                if (targetField is null
                    || !FieldSetters.ContainsKey(targetField)
                    || !targets.Add(targetField)
                    || !mapping.TryAdd(columnNumber, targetField))
                {
                    return false;
                }
            }

            if (mapping.Count == 0)
            {
                errorCode = "missing_column_mapping";
                return false;
            }

            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string CreateFingerprint(
        ReadOnlyMemory<byte> workbookBytes,
        string worksheetName,
        IReadOnlyDictionary<int, string> mapping)
    {
        var workbookHash = Convert.ToHexString(SHA256.HashData(workbookBytes.Span));
        var canonical = $"{workbookHash}\0{worksheetName}\0{string.Join('\n', mapping.OrderBy(item => item.Key).Select(item => $"{item.Key}:{item.Value}"))}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical))).ToLowerInvariant();
    }

    private static string SafeFileName(string sourceFileName)
    {
        var fileName = Path.GetFileName(sourceFileName);
        var safeName = new string(fileName.Select(character => char.IsControl(character) ? '_' : character).Take(255).ToArray());
        return string.IsNullOrWhiteSpace(safeName) ? "workbook.xlsx" : safeName;
    }

    private static async Task<ImportBatch?> FindBatchAsync(
        ProductMasterDataDbContext database,
        Guid actorId,
        string fingerprint,
        CancellationToken cancellationToken) =>
        await database.ImportBatches
            .AsNoTracking()
            .Include(batch => batch.Issues)
            .SingleOrDefaultAsync(batch => batch.InitiatingUserId == actorId
                && batch.RequestFingerprint == fingerprint, cancellationToken);

    internal static ImportBatchResponse ToResponse(ImportBatch batch, bool replayed) => new(
        batch.Id,
        batch.SourceFileName,
        batch.Status,
        batch.StartedAt,
        batch.CompletedAt,
        batch.ScannedRows,
        batch.ImportedRows,
        batch.SkippedRows,
        replayed,
        batch.Issues.OrderBy(issue => issue.RowNumber)
            .Select(issue => new ImportRowIssueResponse(issue.RowNumber, issue.Code))
            .ToArray());

    private static bool IsUniqueViolation(DbUpdateException exception, string constraintName) =>
        exception.GetBaseException() is PostgresException postgres
        && postgres.SqlState == PostgresErrorCodes.UniqueViolation
        && string.Equals(postgres.ConstraintName, constraintName, StringComparison.Ordinal);
}

public sealed record ImportBatchResponse(
    Guid BatchId,
    string SourceFileName,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset CompletedAt,
    int ScannedRows,
    int ImportedRows,
    int SkippedRows,
    bool Replayed,
    IReadOnlyList<ImportRowIssueResponse> Issues);

public sealed record ImportRowIssueResponse(int RowNumber, string Code);
