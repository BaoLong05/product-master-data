using Microsoft.EntityFrameworkCore;
using ProductMasterData.Api.Catalog;
using ProductMasterData.Api.Identity;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Imports;

public static class ImportHistoryEndpoints
{
    private const int DefaultPageSize = 20;
    private const int MaximumPageSize = 100;

    public static IEndpointRouteBuilder MapImportHistoryEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var history = endpoints.MapGroup("/api/v1/imports/history")
            .WithTags("Imports")
            .RequireAuthorization(PermissionPolicies.For("imports.read"));

        history.MapGet("", ListAsync);
        history.MapGet("/{batchId:guid}", GetAsync);
        return endpoints;
    }

    private static async Task<IResult> ListAsync(
        int? take,
        ProductMasterDataDbContext database,
        CancellationToken cancellationToken)
    {
        var pageSize = take ?? DefaultPageSize;
        if (pageSize is < 1 or > MaximumPageSize)
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_page_size", "The history page size must be between 1 and 100."));
        }

        var batches = await database.ImportBatches
            .AsNoTracking()
            .OrderByDescending(batch => batch.StartedAt)
            .ThenByDescending(batch => batch.Id)
            .Take(pageSize)
            .Select(batch => new ImportBatchSummaryResponse(
                batch.Id,
                batch.SourceFileName,
                batch.Status,
                batch.StartedAt,
                batch.CompletedAt,
                batch.ScannedRows,
                batch.ImportedRows,
                batch.SkippedRows))
            .ToListAsync(cancellationToken);

        return Results.Ok(new ImportHistoryResponse(batches));
    }

    private static async Task<IResult> GetAsync(
        Guid batchId,
        ProductMasterDataDbContext database,
        CancellationToken cancellationToken)
    {
        var batch = await database.ImportBatches
            .AsNoTracking()
            .Include(item => item.Issues)
            .SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken);
        return batch is null
            ? Results.NotFound()
            : Results.Ok(ImportCommitEndpoints.ToResponse(batch, replayed: false));
    }
}

public sealed record ImportHistoryResponse(IReadOnlyList<ImportBatchSummaryResponse> Batches);

public sealed record ImportBatchSummaryResponse(
    Guid BatchId,
    string SourceFileName,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset CompletedAt,
    int ScannedRows,
    int ImportedRows,
    int SkippedRows);
