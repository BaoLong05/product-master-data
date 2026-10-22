using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ProductMasterData.Api.Identity;
using ProductMasterData.Domain.Identity;
using ProductMasterData.Infrastructure.Identity;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Tests;

public sealed class PostgresPermissionAuthorizationTests
{
    [PostgresFact]
    public async Task Persisted_grant_and_revocation_are_enforced_by_postgres()
    {
        var connectionString = Environment.GetEnvironmentVariable("PRODUCTMASTERDATA_TEST_POSTGRES")!;
        var connection = new NpgsqlConnectionStringBuilder(connectionString);
        Assert.Equal("permission_test", connection.Database);
        Assert.Equal("127.0.0.1", connection.Host);
        var options = new DbContextOptionsBuilder<ProductMasterDataDbContext>()
            .UseNpgsql(connection.ConnectionString)
            .Options;
        await using (var setup = new ProductMasterDataDbContext(options))
        {
            await setup.Database.EnsureCreatedAsync();
            var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = $"pg-{Guid.NewGuid():N}" };
            var role = new ApplicationRole
            {
                Id = Guid.NewGuid(),
                Name = $"pg-reader-{Guid.NewGuid():N}",
                NormalizedName = $"PG-READER-{Guid.NewGuid():N}"
            };
            setup.Users.Add(user);
            setup.Roles.Add(role);
            setup.UserRoles.Add(new IdentityUserRole<Guid> { UserId = user.Id, RoleId = role.Id });
            setup.RolePermissions.Add(new RolePermission(role.Id, "records.read"));
            await setup.SaveChangesAsync();

            var requirement = new PermissionRequirement("records.read");
            var principal = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())],
                "test"));
            var grantContext = new AuthorizationHandlerContext([requirement], principal, resource: null);
            await new PermissionAuthorizationHandler(setup).HandleAsync(grantContext);
            Assert.True(grantContext.HasSucceeded);

            var grant = await setup.RolePermissions.SingleAsync(item => item.RoleId == role.Id);
            setup.RolePermissions.Remove(grant);
            await setup.SaveChangesAsync();

            await using var nextRequest = new ProductMasterDataDbContext(options);
            var revokedContext = new AuthorizationHandlerContext([requirement], principal, resource: null);
            await new PermissionAuthorizationHandler(nextRequest).HandleAsync(revokedContext);
            Assert.False(revokedContext.HasSucceeded);

            setup.UserRoles.RemoveRange(setup.UserRoles.Where(item => item.UserId == user.Id));
            setup.Users.Remove(user);
            setup.Roles.Remove(role);
            await setup.SaveChangesAsync();
        }
    }
}

internal sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PRODUCTMASTERDATA_TEST_POSTGRES")))
        {
            Skip = "Set PRODUCTMASTERDATA_TEST_POSTGRES to a dedicated disposable PostgreSQL database to run this provider test.";
        }
    }
}
