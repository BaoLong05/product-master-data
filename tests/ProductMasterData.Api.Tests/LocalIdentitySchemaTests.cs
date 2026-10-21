using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using ProductMasterData.Domain.Identity;
using ProductMasterData.Infrastructure.Identity;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Tests;

public sealed class LocalIdentitySchemaTests
{
    [Fact]
    public void Identity_uses_guid_users_roles_and_unique_normalized_usernames()
    {
        using var context = CreateContext();
        var model = context.GetService<IDesignTimeModel>().Model;
        var user = Assert.Single(model.GetEntityTypes(), entity => entity.ClrType == typeof(ApplicationUser));
        var role = Assert.Single(model.GetEntityTypes(), entity => entity.ClrType == typeof(ApplicationRole));

        Assert.Equal("AspNetUsers", user.GetTableName());
        Assert.Equal("AspNetRoles", role.GetTableName());
        Assert.Equal(typeof(Guid), user.FindPrimaryKey()?.Properties.Single().ClrType);
        Assert.Contains(user.GetIndexes(), index =>
            index.IsUnique && index.Properties.Select(property => property.Name).SequenceEqual(["NormalizedUserName"]));
    }

    [Fact]
    public void Permission_catalog_and_role_grants_have_seeded_keys_and_composite_foreign_key()
    {
        using var context = CreateContext();
        var model = context.GetService<IDesignTimeModel>().Model;
        var permission = Assert.Single(model.GetEntityTypes(), entity => entity.ClrType == typeof(Permission));
        var rolePermission = Assert.Single(model.GetEntityTypes(), entity => entity.ClrType == typeof(RolePermission));

        Assert.Equal("permissions", permission.GetTableName());
        Assert.Equal(22, permission.GetSeedData().Count());
        Assert.Equal("role_permissions", rolePermission.GetTableName());
        Assert.Equal(
            [nameof(RolePermission.RoleId), nameof(RolePermission.PermissionKey)],
            rolePermission.FindPrimaryKey()?.Properties.Select(property => property.Name));
        Assert.Equal(2, rolePermission.GetForeignKeys().Count());
    }

    private static ProductMasterDataDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ProductMasterDataDbContext>()
            .UseNpgsql("Host=localhost;Database=identity-model-only;Username=test;Password=test")
            .Options;

        return new ProductMasterDataDbContext(options);
    }
}
