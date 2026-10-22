using System.Security.Claims;

using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ProductMasterData.Domain.Identity;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Identity;

public sealed record PermissionRequirement(string PermissionKey) : IAuthorizationRequirement;

public static class PermissionPolicies
{
    private const string Prefix = "permission:";

    public static string For(string permissionKey)
    {
        if (!PermissionCatalog.All.Any(permission => permission.Key == permissionKey))
        {
            throw new ArgumentException("Permission key is not in the catalog.", nameof(permissionKey));
        }

        return Prefix + permissionKey;
    }

    public static void AddCatalogPolicies(AuthorizationOptions options)
    {
        foreach (var permission in PermissionCatalog.All)
        {
            var key = permission.Key;
            options.AddPolicy(For(key), policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.AddRequirements(new PermissionRequirement(key));
            });
        }
    }
}

public sealed class PermissionAuthorizationHandler(ProductMasterDataDbContext database)
    : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var rawUserId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(rawUserId, out var userId))
        {
            return;
        }

        var isActive = await database.Users
            .AnyAsync(user => user.Id == userId && user.IsActive);
        if (!isActive)
        {
            return;
        }

        var hasGrant = await (
            from userRole in database.UserRoles
            join rolePermission in database.RolePermissions
                on userRole.RoleId equals rolePermission.RoleId
            where userRole.UserId == userId && rolePermission.PermissionKey == requirement.PermissionKey
            select userRole.UserId)
            .AnyAsync();

        if (hasGrant)
        {
            context.Succeed(requirement);
        }
    }
}