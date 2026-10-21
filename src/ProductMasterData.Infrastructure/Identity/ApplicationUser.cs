using Microsoft.AspNetCore.Identity;

namespace ProductMasterData.Infrastructure.Identity;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public bool IsActive { get; set; } = true;
}
