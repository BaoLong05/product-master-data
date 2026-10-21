using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using ProductMasterData.Infrastructure.Identity;

namespace ProductMasterData.Api.Identity;

internal sealed class ActiveUserCookieValidator(
    UserManager<ApplicationUser> userManager,
    IOptions<IdentityOptions> identityOptions)
{
    public async Task ValidateAsync(CookieValidatePrincipalContext context)
    {
        var principal = context.Principal;
        var claimsIdentityOptions = identityOptions.Value.ClaimsIdentity;
        var userId = principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        var cookieSecurityStamp = principal?.FindFirstValue(claimsIdentityOptions.SecurityStampClaimType);

        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(cookieSecurityStamp))
        {
            await RejectPrincipalAsync(context);
            return;
        }

        var user = await userManager.FindByIdAsync(userId);
        if (user is null || !user.IsActive)
        {
            await RejectPrincipalAsync(context);
            return;
        }

        var currentSecurityStamp = await userManager.GetSecurityStampAsync(user);
        if (string.IsNullOrWhiteSpace(currentSecurityStamp) || !SecurityStampsMatch(cookieSecurityStamp, currentSecurityStamp))
        {
            await RejectPrincipalAsync(context);
        }
    }

    private static bool SecurityStampsMatch(string cookieStamp, string currentStamp)
    {
        var cookieBytes = Encoding.UTF8.GetBytes(cookieStamp);
        var currentBytes = Encoding.UTF8.GetBytes(currentStamp);
        return cookieBytes.Length == currentBytes.Length && CryptographicOperations.FixedTimeEquals(cookieBytes, currentBytes);
    }

    private static async Task RejectPrincipalAsync(CookieValidatePrincipalContext context)
    {
        context.RejectPrincipal();
        await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    }
}
