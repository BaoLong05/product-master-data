using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProductMasterData.Domain.Identity;
using ProductMasterData.Infrastructure.Identity;

namespace ProductMasterData.Infrastructure.Persistence.Configurations;

public sealed class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> builder)
    {
        builder.ToTable("role_permissions");
        builder.HasKey(grant => new { grant.RoleId, grant.PermissionKey });

        builder.Property(grant => grant.RoleId).HasColumnName("role_id");
        builder.Property(grant => grant.PermissionKey)
            .HasColumnName("permission_key")
            .HasMaxLength(100)
            .IsRequired();

        builder.HasOne<ApplicationRole>()
            .WithMany()
            .HasForeignKey(grant => grant.RoleId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Permission>()
            .WithMany()
            .HasForeignKey(grant => grant.PermissionKey)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(grant => grant.PermissionKey)
            .HasDatabaseName("ix_role_permissions_permission_key");
    }
}
