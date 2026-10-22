using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProductMasterData.Api.Identity;
using ProductMasterData.Domain.Identity;
using ProductMasterData.Infrastructure.Identity;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Tests;

public sealed class PermissionAuthorizationTests
{
    [Fact]
    public async Task User_with_persisted_permission_grant_is_authorized()
    {
        await using var database = CreateDatabase();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "allowed" };
        var role = new ApplicationRole { Id = Guid.NewGuid(), Name = "reader", NormalizedName = "READER" };
        await AddGrantAsync(database, user, role, "records.read");
        var requirement = new PermissionRequirement("records.read");
        var context = CreateAuthorizationContext(user.Id.ToString(), requirement);

        await new PermissionAuthorizationHandler(database).HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task Principal_permission_claim_does_not_authorize_without_current_database_grant()
    {
        await using var database = CreateDatabase();
        var requirement = new PermissionRequirement("records.read");
        var context = CreateAuthorizationContext(
            Guid.NewGuid().ToString(),
            requirement,
            new Claim("permission", "records.read"),
            new Claim(ClaimTypes.Role, "Administrator"));

        await new PermissionAuthorizationHandler(database).HandleAsync(context);

        Assert.False(context.HasSucceeded);
    }

    [Fact]
    public async Task Removing_persisted_grant_denies_permission_on_next_evaluation()
    {
        await using var database = CreateDatabase();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "revoked" };
        var role = new ApplicationRole { Id = Guid.NewGuid(), Name = "reader", NormalizedName = "READER" };
        await AddGrantAsync(database, user, role, "records.read");
        var requirement = new PermissionRequirement("records.read");
        var handler = new PermissionAuthorizationHandler(database);
        var granted = CreateAuthorizationContext(user.Id.ToString(), requirement);
        await handler.HandleAsync(granted);
        Assert.True(granted.HasSucceeded);

        database.RolePermissions.RemoveRange(database.RolePermissions);
        await database.SaveChangesAsync();
        var revoked = CreateAuthorizationContext(user.Id.ToString(), requirement);

        await handler.HandleAsync(revoked);

        Assert.False(revoked.HasSucceeded);
    }

    [Fact]
    public async Task Anonymous_principal_is_denied_even_when_an_account_has_a_grant()
    {
        await using var database = CreateDatabase();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "allowed" };
        var role = new ApplicationRole { Id = Guid.NewGuid(), Name = "reader", NormalizedName = "READER" };
        await AddGrantAsync(database, user, role, "records.read");
        var requirement = new PermissionRequirement("records.read");
        var context = new AuthorizationHandlerContext([requirement], new ClaimsPrincipal(), resource: null);

        await new PermissionAuthorizationHandler(database).HandleAsync(context);

        Assert.False(context.HasSucceeded);
    }

    [Fact]
    public async Task Registered_permission_policy_uses_persisted_grants()
    {
        await using var database = CreateDatabase();
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "policy-user" };
        var role = new ApplicationRole { Id = Guid.NewGuid(), Name = "reader", NormalizedName = "READER" };
        await AddGrantAsync(database, user, role, "records.read");
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization(PermissionPolicies.AddCatalogPolicies);
        services.AddSingleton(database);
        services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
        using var provider = services.BuildServiceProvider();
        await using var scope = provider.CreateAsyncScope();
        var authorization = scope.ServiceProvider.GetRequiredService<IAuthorizationService>();
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())],
            "test"));

        var result = await authorization.AuthorizeAsync(principal, PermissionPolicies.For("records.read"));

        Assert.True(result.Succeeded);
    }

    [Fact]
    public void Unknown_permission_key_cannot_become_a_policy()
    {
        Assert.Throws<ArgumentException>(() => PermissionPolicies.For("records.root"));
    }

    private static ProductMasterDataDbContext CreateDatabase()
    {
        var options = new DbContextOptionsBuilder<ProductMasterDataDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var database = new ProductMasterDataDbContext(options);
        database.Database.EnsureCreated();
        return database;
    }

    private static async Task AddGrantAsync(
        ProductMasterDataDbContext database,
        ApplicationUser user,
        ApplicationRole role,
        string permissionKey)
    {
        database.Users.Add(user);
        database.Roles.Add(role);
        if (!await database.Permissions.AnyAsync(permission => permission.Key == permissionKey))
        {
            database.Permissions.Add(new Permission(permissionKey, permissionKey));
        }

        database.UserRoles.Add(new IdentityUserRole<Guid> { UserId = user.Id, RoleId = role.Id });
        database.RolePermissions.Add(new RolePermission(role.Id, permissionKey));
        await database.SaveChangesAsync();
    }

    private static AuthorizationHandlerContext CreateAuthorizationContext(
        string? userId,
        PermissionRequirement requirement,
        params Claim[] additionalClaims)
    {
        var claims = additionalClaims.ToList();
        if (userId is not null)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));
        }

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
        return new AuthorizationHandlerContext([requirement], principal, resource: null);
    }
}
