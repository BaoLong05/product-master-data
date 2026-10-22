using System.Linq.Expressions;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ProductMasterData.Api.Identity;
using ProductMasterData.Domain.Audit;
using ProductMasterData.Domain.Catalog;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Catalog;

public static class ProductRecordEndpoints
{
    private const string MCodeUniqueConstraint = "ux_product_records_m_code_non_empty";
    private static readonly IReadOnlyDictionary<string, string> SourceFields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["dateValue"] = nameof(ProductRecord.DateValue),
        ["companyName"] = nameof(ProductRecord.CompanyName),
        ["itemName"] = nameof(ProductRecord.ItemName),
        ["mCode"] = nameof(ProductRecord.MCode),
        ["itemCode"] = nameof(ProductRecord.ItemCode),
        ["productType"] = nameof(ProductRecord.ProductType),
        ["productStatus"] = nameof(ProductRecord.ProductStatus),
        ["approvalStatus"] = nameof(ProductRecord.ApprovalStatus),
        ["sampleOrProductionOrder"] = nameof(ProductRecord.SampleOrProductionOrder),
        ["companyNameLetters"] = nameof(ProductRecord.CompanyNameLetters),
        ["oldRegion"] = nameof(ProductRecord.OldRegion),
        ["sampleSavedDate"] = nameof(ProductRecord.SampleSavedDate),
        ["picImage"] = nameof(ProductRecord.PicImage),
        ["purchaseOrder"] = nameof(ProductRecord.PurchaseOrder),
        ["productionOrderPdf"] = nameof(ProductRecord.ProductionOrderPdf),
        ["note"] = nameof(ProductRecord.Note),
        ["printedAt"] = nameof(ProductRecord.PrintedAt),
        ["discName"] = nameof(ProductRecord.DiscName),
        ["soi"] = nameof(ProductRecord.Soi),
        ["maso"] = nameof(ProductRecord.Maso),
        ["denier"] = nameof(ProductRecord.Denier),
        ["price"] = nameof(ProductRecord.Price),
        ["region"] = nameof(ProductRecord.Region),
        ["quantity"] = nameof(ProductRecord.Quantity),
        ["picUrl"] = nameof(ProductRecord.PicUrl),
        ["internalItem"] = nameof(ProductRecord.InternalItem),
        ["request"] = nameof(ProductRecord.Request)
    };

    public static IEndpointRouteBuilder MapProductRecordEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var records = endpoints.MapGroup("/api/v1/records").WithTags("Product records");
        records.MapGet("", ListAsync)
            .RequireAuthorization(PermissionPolicies.For("records.read"));
        records.MapGet("/{id:guid}", GetByIdAsync)
            .WithName("GetProductRecord")
            .RequireAuthorization(PermissionPolicies.For("records.read"));
        records.MapGet("/{id:guid}/audit", GetAuditAsync)
            .RequireAuthorization(PermissionPolicies.For("audit.read"));
        records.MapPost("", CreateAsync)
            .RequireAuthorization(PermissionPolicies.For("records.create"));
        records.MapPut("/{id:guid}", UpdateAsync)
            .RequireAuthorization(PermissionPolicies.For("records.update"));
        records.MapDelete("/{id:guid}", DeleteAsync)
            .RequireAuthorization(PermissionPolicies.For("records.delete"));
        return endpoints;
    }

    private static async Task<IResult> ListAsync(
        ProductMasterDataDbContext database,
        HttpRequest httpRequest,
        CancellationToken cancellationToken,
        int page = 1,
        int pageSize = 50,
        string? q = null)
    {
        if (page < 1 || pageSize is < 1 or > 100)
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_pagination", "Page must be positive and pageSize must be between 1 and 100."));
        }

        var allowedQueryKeys = SourceFields.Keys
            .Append("q")
            .Append("page")
            .Append("pageSize")
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (httpRequest.Query.Keys.Any(key => !allowedQueryKeys.Contains(key)))
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_query_parameter", "The query contains an unsupported search or filter field."));
        }

        if (httpRequest.Query.Any(parameter => parameter.Value.Count != 1))
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_query_value", "Each search or filter parameter must have exactly one value."));
        }

        var activeRecords = database.ProductRecords.AsNoTracking().Where(record => !record.IsDeleted);
        if (!string.IsNullOrEmpty(q))
        {
            activeRecords = activeRecords.Where(BuildSearchPredicate(q));
        }

        foreach (var (queryName, propertyName) in SourceFields)
        {
            if (httpRequest.Query.TryGetValue(queryName, out var filter) && !string.IsNullOrEmpty(filter[0]))
            {
                activeRecords = activeRecords.Where(BuildFieldFilterPredicate(propertyName, filter[0]!));
            }
        }

        var totalCount = await activeRecords.CountAsync(cancellationToken);
        var offset = (long)(page - 1) * pageSize;
        var items = offset >= totalCount
            ? []
            : await activeRecords
                .OrderByDescending(record => record.UpdatedAt)
                .ThenBy(record => record.Id)
                .Skip((int)offset)
                .Take(pageSize)
                .Select(record => new ProductRecordListItemResponse(
                    record.Id,
                    record.MCode,
                    record.ItemName,
                    record.CompanyName,
                    record.ProductStatus,
                    record.UpdatedAt,
                    record.Version))
                .ToListAsync(cancellationToken);

        return Results.Ok(new ProductRecordPageResponse(items, page, pageSize, totalCount));
    }

    private static Expression<Func<ProductRecord, bool>> BuildSearchPredicate(string searchText)
    {
        var record = Expression.Parameter(typeof(ProductRecord), "record");
        var toLower = typeof(string).GetMethod(nameof(string.ToLower), Type.EmptyTypes)!;
        var contains = typeof(string).GetMethod(nameof(string.Contains), [typeof(string)])!;
        Expression? matchAny = null;

        foreach (var propertyName in SourceFields.Values)
        {
            var fieldMatches = BuildContainsExpression(Expression.Property(record, propertyName), searchText, toLower, contains);
            matchAny = matchAny is null ? fieldMatches : Expression.OrElse(matchAny, fieldMatches);
        }

        return Expression.Lambda<Func<ProductRecord, bool>>(matchAny!, record);
    }

    private static Expression<Func<ProductRecord, bool>> BuildFieldFilterPredicate(string propertyName, string filterText)
    {
        var record = Expression.Parameter(typeof(ProductRecord), "record");
        var field = Expression.Property(record, propertyName);
        var toLower = typeof(string).GetMethod(nameof(string.ToLower), Type.EmptyTypes)!;
        var contains = typeof(string).GetMethod(nameof(string.Contains), [typeof(string)])!;
        return Expression.Lambda<Func<ProductRecord, bool>>(
            BuildContainsExpression(field, filterText, toLower, contains), record);
    }

    private static Expression BuildContainsExpression(
        Expression field,
        string text,
        System.Reflection.MethodInfo toLower,
        System.Reflection.MethodInfo contains)
    {
        var notNull = Expression.NotEqual(field, Expression.Constant(null, typeof(string)));
        var containsText = Expression.Call(
            Expression.Call(field, toLower),
            contains,
            Expression.Constant(text.ToLowerInvariant()));
        return Expression.AndAlso(notNull, containsText);
    }

    private static async Task<IResult> GetByIdAsync(
        Guid id,
        ProductMasterDataDbContext database,
        CancellationToken cancellationToken)
    {
        var record = await database.ProductRecords
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id && !item.IsDeleted, cancellationToken);

        return record is null
            ? Results.NotFound()
            : Results.Ok(ToResponse(record));
    }

    private static async Task<IResult> GetAuditAsync(
        Guid id,
        ProductMasterDataDbContext database,
        CancellationToken cancellationToken)
    {
        if (!await database.ProductRecords.AsNoTracking().AnyAsync(record => record.Id == id, cancellationToken))
        {
            return Results.NotFound();
        }

        var events = await database.AuditEvents
            .AsNoTracking()
            .Where(auditEvent => auditEvent.Target == RecordTarget(id))
            .OrderBy(auditEvent => auditEvent.OccurredAt)
            .ThenBy(auditEvent => auditEvent.EventId)
            .ToListAsync(cancellationToken);

        return Results.Ok(events.Select(auditEvent => new ProductRecordAuditResponse(
            auditEvent.EventId,
            auditEvent.ActorId,
            auditEvent.OccurredAt,
            auditEvent.Action,
            auditEvent.Target,
            auditEvent.Outcome,
            auditEvent.CorrelationId,
            ParseMetadata(auditEvent.MetadataJson))));
    }

    private static JsonElement ParseMetadata(string metadataJson)
    {
        using var document = JsonDocument.Parse(metadataJson);
        return document.RootElement.Clone();
    }

    private static async Task<IResult> CreateAsync(
        CreateProductRecordRequest request,
        ProductMasterDataDbContext database,
        IAntiforgery antiforgery,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        if (!await antiforgery.IsRequestValidAsync(httpContext))
        {
            return Results.BadRequest();
        }

        if (!Guid.TryParse(httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorId))
        {
            return Results.Unauthorized();
        }

        if (!string.IsNullOrEmpty(request.MCode) && await database.ProductRecords
                .AnyAsync(record => record.MCode == request.MCode, cancellationToken))
        {
            return DuplicateMCode();
        }

        var record = new ProductRecord
        {
            DateValue = request.DateValue,
            CompanyName = request.CompanyName,
            ItemName = request.ItemName,
            MCode = request.MCode,
            ItemCode = request.ItemCode,
            ProductType = request.ProductType,
            ProductStatus = request.ProductStatus,
            ApprovalStatus = request.ApprovalStatus,
            SampleOrProductionOrder = request.SampleOrProductionOrder,
            CompanyNameLetters = request.CompanyNameLetters,
            OldRegion = request.OldRegion,
            SampleSavedDate = request.SampleSavedDate,
            PicImage = request.PicImage,
            PurchaseOrder = request.PurchaseOrder,
            ProductionOrderPdf = request.ProductionOrderPdf,
            Note = request.Note,
            PrintedAt = request.PrintedAt,
            DiscName = request.DiscName,
            Soi = request.Soi,
            Maso = request.Maso,
            Denier = request.Denier,
            Price = request.Price,
            Region = request.Region,
            Quantity = request.Quantity,
            PicUrl = request.PicUrl,
            InternalItem = request.InternalItem,
            Request = request.Request
        };

        database.ProductRecords.Add(record);
        database.AuditEvents.Add(AuditEvent.Create(
            actorId,
            "records.created",
            RecordTarget(record.Id),
            "succeeded",
            httpContext.TraceIdentifier,
            JsonSerializer.Serialize(new { recordId = record.Id })));
        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsDuplicateMCodeViolation(exception))
        {
            return DuplicateMCode();
        }

        return Results.CreatedAtRoute("GetProductRecord", new { id = record.Id }, ToResponse(record));
    }

    private static async Task<IResult> UpdateAsync(
        Guid id,
        UpdateProductRecordRequest request,
        ProductMasterDataDbContext database,
        IAntiforgery antiforgery,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        if (!await antiforgery.IsRequestValidAsync(httpContext))
        {
            return Results.BadRequest();
        }

        if (!Guid.TryParse(httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorId))
        {
            return Results.Unauthorized();
        }

        var record = await database.ProductRecords
            .SingleOrDefaultAsync(item => item.Id == id && !item.IsDeleted, cancellationToken);
        if (record is null)
        {
            return Results.NotFound();
        }

        if (record.Version != request.Version)
        {
            return Results.Conflict(new ApiErrorResponse("record_version_conflict", "The record has changed. Reload it before saving."));
        }

        if (!string.IsNullOrEmpty(request.MCode) && await database.ProductRecords
                .AnyAsync(item => item.Id != id && item.MCode == request.MCode, cancellationToken))
        {
            return DuplicateMCode();
        }

        var previousVersion = record.Version;
        record.DateValue = request.DateValue;
        record.CompanyName = request.CompanyName;
        record.ItemName = request.ItemName;
        record.MCode = request.MCode;
        record.ItemCode = request.ItemCode;
        record.ProductType = request.ProductType;
        record.ProductStatus = request.ProductStatus;
        record.ApprovalStatus = request.ApprovalStatus;
        record.SampleOrProductionOrder = request.SampleOrProductionOrder;
        record.CompanyNameLetters = request.CompanyNameLetters;
        record.OldRegion = request.OldRegion;
        record.SampleSavedDate = request.SampleSavedDate;
        record.PicImage = request.PicImage;
        record.PurchaseOrder = request.PurchaseOrder;
        record.ProductionOrderPdf = request.ProductionOrderPdf;
        record.Note = request.Note;
        record.PrintedAt = request.PrintedAt;
        record.DiscName = request.DiscName;
        record.Soi = request.Soi;
        record.Maso = request.Maso;
        record.Denier = request.Denier;
        record.Price = request.Price;
        record.Region = request.Region;
        record.Quantity = request.Quantity;
        record.PicUrl = request.PicUrl;
        record.InternalItem = request.InternalItem;
        record.Request = request.Request;
        record.AdvanceVersion();
        database.AuditEvents.Add(AuditEvent.Create(
            actorId,
            "records.updated",
            RecordTarget(record.Id),
            "succeeded",
            httpContext.TraceIdentifier,
            JsonSerializer.Serialize(new { recordId = record.Id, previousVersion, version = record.Version })));

        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Results.Conflict(new ApiErrorResponse("record_version_conflict", "The record has changed. Reload it before saving."));
        }
        catch (DbUpdateException exception) when (IsDuplicateMCodeViolation(exception))
        {
            return DuplicateMCode();
        }

        return Results.Ok(ToResponse(record));
    }

    private static async Task<IResult> DeleteAsync(
        Guid id,
        long version,
        ProductMasterDataDbContext database,
        IAntiforgery antiforgery,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        if (!await antiforgery.IsRequestValidAsync(httpContext))
        {
            return Results.BadRequest();
        }

        if (!Guid.TryParse(httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorId))
        {
            return Results.Unauthorized();
        }

        var record = await database.ProductRecords
            .SingleOrDefaultAsync(item => item.Id == id && !item.IsDeleted, cancellationToken);
        if (record is null)
        {
            return Results.NotFound();
        }

        if (record.Version != version)
        {
            return Results.Conflict(new ApiErrorResponse("record_version_conflict", "The record has changed. Reload it before deleting."));
        }

        var previousVersion = record.Version;
        record.SoftDelete();
        database.AuditEvents.Add(AuditEvent.Create(
            actorId,
            "records.deleted",
            RecordTarget(record.Id),
            "succeeded",
            httpContext.TraceIdentifier,
            JsonSerializer.Serialize(new { recordId = record.Id, previousVersion, version = record.Version })));

        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Results.Conflict(new ApiErrorResponse("record_version_conflict", "The record has changed. Reload it before deleting."));
        }

        return Results.NoContent();
    }

    private static IResult DuplicateMCode() =>
        Results.Conflict(new ApiErrorResponse("duplicate_m_code", "A record with this M.CODE already exists."));

    private static string RecordTarget(Guid recordId) => $"product_records/{recordId:D}";

    private static bool IsDuplicateMCodeViolation(DbUpdateException exception) =>
        exception.GetBaseException() is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: MCodeUniqueConstraint
        };

    private static ProductRecordResponse ToResponse(ProductRecord record) => new(
        record.Id,
        record.DateValue,
        record.CompanyName,
        record.ItemName,
        record.MCode,
        record.ItemCode,
        record.ProductType,
        record.ProductStatus,
        record.ApprovalStatus,
        record.SampleOrProductionOrder,
        record.CompanyNameLetters,
        record.OldRegion,
        record.SampleSavedDate,
        record.PicImage,
        record.PurchaseOrder,
        record.ProductionOrderPdf,
        record.Note,
        record.PrintedAt,
        record.DiscName,
        record.Soi,
        record.Maso,
        record.Denier,
        record.Price,
        record.Region,
        record.Quantity,
        record.PicUrl,
        record.InternalItem,
        record.Request,
        record.CreatedAt,
        record.UpdatedAt,
        record.Version);
}

public sealed record ProductRecordAuditResponse(
    Guid EventId,
    Guid? ActorId,
    DateTimeOffset OccurredAt,
    string Action,
    string Target,
    string Outcome,
    string CorrelationId,
    JsonElement Metadata);

public sealed record CreateProductRecordRequest(
    string? DateValue = null,
    string? CompanyName = null,
    string? ItemName = null,
    string? MCode = null,
    string? ItemCode = null,
    string? ProductType = null,
    string? ProductStatus = null,
    string? ApprovalStatus = null,
    string? SampleOrProductionOrder = null,
    string? CompanyNameLetters = null,
    string? OldRegion = null,
    string? SampleSavedDate = null,
    string? PicImage = null,
    string? PurchaseOrder = null,
    string? ProductionOrderPdf = null,
    string? Note = null,
    string? PrintedAt = null,
    string? DiscName = null,
    string? Soi = null,
    string? Maso = null,
    string? Denier = null,
    string? Price = null,
    string? Region = null,
    string? Quantity = null,
    string? PicUrl = null,
    string? InternalItem = null,
    string? Request = null);

public sealed record UpdateProductRecordRequest(
    long Version,
    string? DateValue = null,
    string? CompanyName = null,
    string? ItemName = null,
    string? MCode = null,
    string? ItemCode = null,
    string? ProductType = null,
    string? ProductStatus = null,
    string? ApprovalStatus = null,
    string? SampleOrProductionOrder = null,
    string? CompanyNameLetters = null,
    string? OldRegion = null,
    string? SampleSavedDate = null,
    string? PicImage = null,
    string? PurchaseOrder = null,
    string? ProductionOrderPdf = null,
    string? Note = null,
    string? PrintedAt = null,
    string? DiscName = null,
    string? Soi = null,
    string? Maso = null,
    string? Denier = null,
    string? Price = null,
    string? Region = null,
    string? Quantity = null,
    string? PicUrl = null,
    string? InternalItem = null,
    string? Request = null);

public sealed record ProductRecordResponse(
    Guid Id,
    string? DateValue,
    string? CompanyName,
    string? ItemName,
    string? MCode,
    string? ItemCode,
    string? ProductType,
    string? ProductStatus,
    string? ApprovalStatus,
    string? SampleOrProductionOrder,
    string? CompanyNameLetters,
    string? OldRegion,
    string? SampleSavedDate,
    string? PicImage,
    string? PurchaseOrder,
    string? ProductionOrderPdf,
    string? Note,
    string? PrintedAt,
    string? DiscName,
    string? Soi,
    string? Maso,
    string? Denier,
    string? Price,
    string? Region,
    string? Quantity,
    string? PicUrl,
    string? InternalItem,
    string? Request,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    long Version);

public sealed record ProductRecordListItemResponse(
    Guid Id,
    string? MCode,
    string? ItemName,
    string? CompanyName,
    string? ProductStatus,
    DateTimeOffset UpdatedAt,
    long Version);

public sealed record ProductRecordPageResponse(
    IReadOnlyList<ProductRecordListItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record ApiErrorResponse(string Code, string Message);
