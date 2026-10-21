namespace ProductMasterData.Domain.Catalog;

public sealed class ProductRecord
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public string? DateValue { get; set; }
    public string? CompanyName { get; set; }
    public string? ItemName { get; set; }
    public string? MCode { get; set; }
    public string? ItemCode { get; set; }
    public string? ProductType { get; set; }
    public string? ProductStatus { get; set; }
    public string? ApprovalStatus { get; set; }
    public string? SampleOrProductionOrder { get; set; }
    public string? CompanyNameLetters { get; set; }
    public string? OldRegion { get; set; }
    public string? SampleSavedDate { get; set; }
    public string? PicImage { get; set; }
    public string? PurchaseOrder { get; set; }
    public string? ProductionOrderPdf { get; set; }
    public string? Note { get; set; }
    public string? PrintedAt { get; set; }
    public string? DiscName { get; set; }
    public string? Soi { get; set; }
    public string? Maso { get; set; }
    public string? Denier { get; set; }
    public string? Price { get; set; }
    public string? Region { get; set; }
    public string? Quantity { get; set; }
    public string? PicUrl { get; set; }
    public string? InternalItem { get; set; }
    public string? Request { get; set; }

    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; private set; } = DateTimeOffset.UtcNow;
    public bool IsDeleted { get; private set; }
    public long Version { get; private set; } = 1;
}
