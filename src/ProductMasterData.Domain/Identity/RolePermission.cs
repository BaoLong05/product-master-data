namespace ProductMasterData.Domain.Identity;

public sealed class RolePermission
{
    private RolePermission()
    {
    }

    public RolePermission(Guid roleId, string permissionKey)
    {
        if (roleId == Guid.Empty)
        {
            throw new ArgumentException("Role ID cannot be empty.", nameof(roleId));
        }

        if (string.IsNullOrWhiteSpace(permissionKey))
        {
            throw new ArgumentException("Permission key cannot be empty.", nameof(permissionKey));
        }

        RoleId = roleId;
        PermissionKey = permissionKey;
    }

    public Guid RoleId { get; private set; }
    public string PermissionKey { get; private set; } = null!;
}
