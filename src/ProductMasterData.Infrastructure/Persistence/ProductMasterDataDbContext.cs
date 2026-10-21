using Microsoft.EntityFrameworkCore;
using ProductMasterData.Domain.Catalog;

namespace ProductMasterData.Infrastructure.Persistence;

public sealed class ProductMasterDataDbContext(DbContextOptions<ProductMasterDataDbContext> options) : DbContext(options)
{
    public DbSet<ProductRecord> ProductRecords => Set<ProductRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProductMasterDataDbContext).Assembly);
    }
}
