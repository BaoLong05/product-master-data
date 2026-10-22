using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using ProductMasterData.Api.Identity;
using ProductMasterData.Application.Imports;
using ProductMasterData.Api.Catalog;

namespace ProductMasterData.Api.Imports;

public static class ImportPreviewEndpoints
{
    private const long MaximumWorkbookBytes = 10 * 1024 * 1024;
    private const long MaximumRequestBytes = MaximumWorkbookBytes + 64 * 1024;

    public static IEndpointRouteBuilder MapImportPreviewEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/v1/imports/preview", PreviewAsync)
            .WithTags("Imports")
            .RequireAuthorization(PermissionPolicies.For("imports.preview"))
            .WithMetadata(
                new RequestSizeLimitAttribute(MaximumRequestBytes),
                new RequestFormLimitsAttribute { MultipartBodyLengthLimit = MaximumWorkbookBytes });
        return endpoints;
    }

    private static async Task<IResult> PreviewAsync(
        IFormFile? file,
        IAntiforgery antiforgery,
        IWorkbookPreviewReader previewReader,
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

        await using var stream = file.OpenReadStream();
        using var buffer = new MemoryStream((int)file.Length);
        await stream.CopyToAsync(buffer, cancellationToken);
        if (buffer.Length > MaximumWorkbookBytes)
        {
            return Results.BadRequest(new ApiErrorResponse("workbook_too_large", "The workbook must not exceed 10 MiB."));
        }

        try
        {
            return Results.Ok(previewReader.ReadHeaders(buffer.GetBuffer().AsMemory(0, (int)buffer.Length)));
        }
        catch (InvalidWorkbookException exception)
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_workbook", exception.Message));
        }
    }
}
