using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using ProductMasterData.Domain.Catalog;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Tests;

public sealed class ProductRecordSchemaTests
{
    [Fact]
    public void Product_record_schema_preserves_all_27_optional_source_fields()
    {
        using var context = CreateContext();
        var entity = context.Model.FindEntityType(typeof(ProductRecord));

        Assert.NotNull(entity);
        Assert.Equal("product_records", entity.GetTableName());

        var sourceFields = entity.GetProperties()
            .Where(property => property.ClrType == typeof(string))
            .ToArray();

        Assert.Equal(27, sourceFields.Length);
        Assert.All(sourceFields, property => Assert.True(property.IsNullable, property.Name));
    }

    [Fact]
    public void Product_record_schema_has_active_listing_index_and_no_unique_m_code_index()
    {
        using var context = CreateContext();
        var entity = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(ProductRecord));

        Assert.NotNull(entity);
        Assert.DoesNotContain(entity.GetIndexes(), index =>
            index.IsUnique && index.Properties.Select(property => property.Name).SequenceEqual([nameof(ProductRecord.MCode)]));

        var listingIndex = Assert.Single(entity.GetIndexes(), index =>
            index.Properties.Select(property => property.Name).SequenceEqual(
                [nameof(ProductRecord.IsDeleted), nameof(ProductRecord.UpdatedAt)]));
        Assert.Equal([false, true], listingIndex.IsDescending);
    }

    private static ProductMasterDataDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ProductMasterDataDbContext>()
            .UseNpgsql("Host=localhost;Database=schema-model-only;Username=test;Password=test")
            .Options;

        return new ProductMasterDataDbContext(options);
    }
}
