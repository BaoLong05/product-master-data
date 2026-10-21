namespace ProductMasterData.Domain.Identity;

public sealed class Permission
{
    private Permission()
    {
    }

    public Permission(string key, string description)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new ArgumentException("Permission key cannot be empty.", nameof(key));
        }

        if (string.IsNullOrWhiteSpace(description))
        {
            throw new ArgumentException("Permission description cannot be empty.", nameof(description));
        }

        Key = key;
        Description = description;
    }

    public string Key { get; private set; } = null!;
    public string Description { get; private set; } = null!;
}
