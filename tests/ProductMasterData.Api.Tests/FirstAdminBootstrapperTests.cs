using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using ProductMasterData.Infrastructure.Identity;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Tests;

public sealed class FirstAdminBootstrapperTests
{
    [Fact]
    public async Task First_bootstrap_creates_hashed_administrator_with_all_catalog_permissions()
    {
        const string password = "A-strong-passphrase-2026";
        await using var provider = await CreateServicesAsync();
        await using var scope = provider.CreateAsyncScope();
        var bootstrapper = scope.ServiceProvider.GetRequiredService<FirstAdminBootstrapper>();

        var result = await bootstrapper.CreateFirstAdminAsync("catalog.admin", password);

        Assert.True(result.Succeeded);
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await users.FindByNameAsync("catalog.admin");
        Assert.NotNull(user);
        Assert.NotEqual(password, user.PasswordHash);
        Assert.True(await users.CheckPasswordAsync(user, password));
        Assert.True(await users.IsInRoleAsync(user, FirstAdminBootstrapper.AdministratorRoleName));

        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
        var role = await roles.FindByNameAsync(FirstAdminBootstrapper.AdministratorRoleName);
        Assert.NotNull(role);
        Assert.True(role.IsBuiltIn);

        var db = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        Assert.Equal(22, await db.RolePermissions.CountAsync(grant => grant.RoleId == role.Id));
    }

    [Fact]
    public async Task Bootstrap_is_refused_when_any_user_already_exists()
    {
        await using var provider = await CreateServicesAsync();
        await using var scope = provider.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        Assert.True((await users.CreateAsync(new ApplicationUser { UserName = "existing.user" }, "Existing-passphrase-2026")).Succeeded);

        var bootstrapper = scope.ServiceProvider.GetRequiredService<FirstAdminBootstrapper>();
        var result = await bootstrapper.CreateFirstAdminAsync("second.admin", "Another-passphrase-2026");

        Assert.False(result.Succeeded);
        Assert.Contains(result.Errors, error => error.Code == "FirstAdminAlreadyExists");
        Assert.Equal(1, await users.Users.CountAsync());
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
        Assert.False(await roles.RoleExistsAsync(FirstAdminBootstrapper.AdministratorRoleName));
    }

    [Fact]
    public async Task Invalid_username_or_short_password_creates_no_identity_state()
    {
        await using var provider = await CreateServicesAsync();
        await using var scope = provider.CreateAsyncScope();
        var bootstrapper = scope.ServiceProvider.GetRequiredService<FirstAdminBootstrapper>();

        var result = await bootstrapper.CreateFirstAdminAsync(" ", "short");

        Assert.False(result.Succeeded);
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
        Assert.Empty(await users.Users.ToListAsync());
        Assert.False(await roles.RoleExistsAsync(FirstAdminBootstrapper.AdministratorRoleName));
    }

    private static async Task<ServiceProvider> CreateServicesAsync()
    {
        var services = new ServiceCollection();
        services.AddLogging(builder => builder.AddProvider(NullLoggerProvider.Instance));
        services.AddDbContext<ProductMasterDataDbContext>(options => options
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<ProductMasterDataDbContext>();
        services.AddScoped<FirstAdminBootstrapper>();

        var provider = services.BuildServiceProvider();
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ProductMasterDataDbContext>();
        await db.Database.EnsureCreatedAsync();
        return provider;
    }
}
