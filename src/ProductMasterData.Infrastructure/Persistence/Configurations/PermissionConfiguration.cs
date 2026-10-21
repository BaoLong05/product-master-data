using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProductMasterData.Domain.Identity;

namespace ProductMasterData.Infrastructure.Persistence.Configurations;

public sealed class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.ToTable("permissions");
        builder.HasKey(permission => permission.Key);
        builder.Property(permission => permission.Key)
            .HasColumnName("permission_key")
            .HasMaxLength(100)
            .IsRequired();
        builder.Property(permission => permission.Description)
            .HasColumnName("description")
            .HasColumnType("text")
            .IsRequired();

        builder.HasData(PermissionCatalog.All.Select(permission => new
        {
            permission.Key,
            permission.Description
        }));
    }
}
