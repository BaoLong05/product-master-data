using Npgsql;
using ProductMasterData.Application.Health;

namespace ProductMasterData.Infrastructure.Health;

public sealed class NpgsqlPostgresReadinessProbe(string? connectionString) : IDatabaseReadinessProbe
{
    public async Task<bool> IsReadyAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return false;
        }

        try
        {
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new NpgsqlCommand("SELECT 1", connection);
            await command.ExecuteScalarAsync(cancellationToken);

            return true;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception) when (
            exception is NpgsqlException or ArgumentException or OperationCanceledException)
        {
            return false;
        }
    }
}
