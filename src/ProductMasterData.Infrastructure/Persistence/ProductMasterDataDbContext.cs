using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using ProductMasterData.Domain.Catalog;
using ProductMasterData.Domain.Identity;
using ProductMasterData.Infrastructure.Identity;

namespace ProductMasterData.Infrastructure.Persistence;

public sealed class ProductMasterDataDbContext(DbContextOptions<ProductMasterDataDbContext> options)
    : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>(options)
{
    public DbSet<ProductRecord> ProductRecords => Set<ProductRecord>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<ApplicationUser>()
            .Property(user => user.IsActive)
            .HasDefaultValue(true)
            .IsRequired();
        modelBuilder.Entity<ApplicationRole>()
            .Property(role => role.IsBuiltIn)
            .HasDefaultValue(false)
            .IsRequired();
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProductMasterDataDbContext).Assembly);
    }
}
