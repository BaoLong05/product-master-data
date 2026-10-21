using Microsoft.AspNetCore.Identity;

namespace ProductMasterData.Infrastructure.Identity;

public sealed class ApplicationRole : IdentityRole<Guid>
{
    public bool IsBuiltIn { get; set; }
}
