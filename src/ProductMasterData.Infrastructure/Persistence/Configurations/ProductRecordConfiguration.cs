using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProductMasterData.Domain.Catalog;

namespace ProductMasterData.Infrastructure.Persistence.Configurations;

public sealed class ProductRecordConfiguration : IEntityTypeConfiguration<ProductRecord>
{
    public void Configure(EntityTypeBuilder<ProductRecord> builder)
    {
        builder.ToTable("product_records");
        builder.HasKey(record => record.Id);

        builder.Property(record => record.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        ConfigureSourceField(builder.Property(record => record.DateValue), "date_value");
        ConfigureSourceField(builder.Property(record => record.CompanyName), "company_name");
        ConfigureSourceField(builder.Property(record => record.ItemName), "item_name");
        ConfigureSourceField(builder.Property(record => record.MCode), "m_code");
        ConfigureSourceField(builder.Property(record => record.ItemCode), "item_code");
        ConfigureSourceField(builder.Property(record => record.ProductType), "product_type");
        ConfigureSourceField(builder.Property(record => record.ProductStatus), "product_status");
        ConfigureSourceField(builder.Property(record => record.ApprovalStatus), "approval_status");
        ConfigureSourceField(builder.Property(record => record.SampleOrProductionOrder), "sample_or_production_order");
        ConfigureSourceField(builder.Property(record => record.CompanyNameLetters), "company_name_letters");
        ConfigureSourceField(builder.Property(record => record.OldRegion), "old_region");
        ConfigureSourceField(builder.Property(record => record.SampleSavedDate), "sample_saved_date");
        ConfigureSourceField(builder.Property(record => record.PicImage), "pic_image");
        ConfigureSourceField(builder.Property(record => record.PurchaseOrder), "purchase_order");
        ConfigureSourceField(builder.Property(record => record.ProductionOrderPdf), "production_order_pdf");
        ConfigureSourceField(builder.Property(record => record.Note), "note");
        ConfigureSourceField(builder.Property(record => record.PrintedAt), "printed_at");
        ConfigureSourceField(builder.Property(record => record.DiscName), "disc_name");
        ConfigureSourceField(builder.Property(record => record.Soi), "soi");
        ConfigureSourceField(builder.Property(record => record.Maso), "maso");
        ConfigureSourceField(builder.Property(record => record.Denier), "denier");
        ConfigureSourceField(builder.Property(record => record.Price), "price");
        ConfigureSourceField(builder.Property(record => record.Region), "region");
        ConfigureSourceField(builder.Property(record => record.Quantity), "quantity");
        ConfigureSourceField(builder.Property(record => record.PicUrl), "pic_url");
        ConfigureSourceField(builder.Property(record => record.InternalItem), "internal_item");
        ConfigureSourceField(builder.Property(record => record.Request), "request");

        builder.Property(record => record.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();
        builder.Property(record => record.UpdatedAt)
            .HasColumnName("updated_at")
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();
        builder.Property(record => record.IsDeleted)
            .HasColumnName("is_deleted")
            .HasDefaultValue(false)
            .IsRequired();
        builder.Property(record => record.Version)
            .HasColumnName("version")
            .HasDefaultValue(1L)
            .IsConcurrencyToken()
            .IsRequired();

        builder.HasIndex(record => record.MCode)
            .HasDatabaseName("ux_product_records_m_code_non_empty")
            .IsUnique()
            .HasFilter("m_code IS NOT NULL AND m_code <> ''");

        builder.HasIndex(record => new { record.IsDeleted, record.UpdatedAt })
            .HasDatabaseName("ix_product_records_active_updated_at")
            .IsDescending(false, true)
            .HasFilter("is_deleted = FALSE");
    }

    private static void ConfigureSourceField(PropertyBuilder<string?> property, string columnName)
    {
        property.HasColumnName(columnName).HasColumnType("text").IsRequired(false);
    }
}
