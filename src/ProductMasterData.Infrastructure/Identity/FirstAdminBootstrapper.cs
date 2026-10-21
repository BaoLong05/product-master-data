using System.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ProductMasterData.Domain.Identity;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Infrastructure.Identity;

public sealed class FirstAdminBootstrapper(
    ProductMasterDataDbContext dbContext,
    UserManager<ApplicationUser> userManager,
    RoleManager<ApplicationRole> roleManager)
{
    public const string AdministratorRoleName = "Administrator";
    private const int MinimumPasswordLength = 12;

    public async Task<IdentityResult> CreateFirstAdminAsync(
        string userName,
        string password,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userName))
        {
            return Failure("InvalidUserName", "A non-empty username is required.");
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < MinimumPasswordLength)
        {
            return Failure("PasswordTooShort", $"Password must contain at least {MinimumPasswordLength} characters.");
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        if (await userManager.Users.AnyAsync(cancellationToken))
        {
            return Failure("FirstAdminAlreadyExists", "An account is already provisioned.");
        }

        if (await roleManager.RoleExistsAsync(AdministratorRoleName))
        {
            return Failure("AdministratorRoleAlreadyExists", "Initial administrator setup is inconsistent.");
        }

        var user = new ApplicationUser
        {
            UserName = userName,
            IsActive = true
        };
        var userResult = await userManager.CreateAsync(user, password);
        if (!userResult.Succeeded)
        {
            return userResult;
        }

        var role = new ApplicationRole
        {
            Name = AdministratorRoleName,
            IsBuiltIn = true
        };
        var roleResult = await roleManager.CreateAsync(role);
        if (!roleResult.Succeeded)
        {
            return roleResult;
        }

        dbContext.RolePermissions.AddRange(PermissionCatalog.All.Select(permission =>
            new RolePermission(role.Id, permission.Key)));
        await dbContext.SaveChangesAsync(cancellationToken);

        var assignmentResult = await userManager.AddToRoleAsync(user, AdministratorRoleName);
        if (!assignmentResult.Succeeded)
        {
            return assignmentResult;
        }

        await transaction.CommitAsync(cancellationToken);
        return IdentityResult.Success;
    }

    private static IdentityResult Failure(string code, string description) =>
        IdentityResult.Failed(new IdentityError { Code = code, Description = description });
}
