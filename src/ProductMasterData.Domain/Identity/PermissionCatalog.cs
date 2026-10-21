namespace ProductMasterData.Domain.Identity;

public static class PermissionCatalog
{
    public static IReadOnlyList<Permission> All { get; } =
    [
        new("records.read", "Read product records"),
        new("records.create", "Create product records"),
        new("records.update", "Update product records"),
        new("records.delete", "Soft-delete product records"),
        new("records.export", "Export product records"),
        new("imports.create", "Upload an import workbook"),
        new("imports.read", "Read import batches"),
        new("imports.preview", "Validate and preview an import"),
        new("imports.commit", "Commit validated import rows"),
        new("imports.cancel", "Cancel an uncommitted import"),
        new("imports.errors.download", "Download import error reports"),
        new("users.read", "Read local user accounts"),
        new("users.create", "Create local user accounts"),
        new("users.update", "Update local user accounts"),
        new("users.deactivate", "Deactivate local user accounts"),
        new("roles.read", "Read roles and permissions"),
        new("roles.create", "Create roles"),
        new("roles.update", "Update roles and permissions"),
        new("roles.delete", "Delete unused roles"),
        new("roles.assign", "Assign roles to users"),
        new("audit.read", "Read audit events"),
        new("system.backup", "Run local database backup operations")
    ];
}
