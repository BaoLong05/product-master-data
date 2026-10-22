using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ProductMasterData.Domain.Audit;
using ProductMasterData.Domain.Catalog;
using ProductMasterData.Infrastructure.Identity;
using ProductMasterData.Infrastructure.Persistence;

namespace ProductMasterData.Api.Tests;

public sealed class PostgresAuditTests
{
    [AuditPostgresFact]
    public async Task Audit_events_are_append_only_and_failed_record_creation_rolls_back_its_audit_event()
    {
        var connection = new NpgsqlConnectionStringBuilder(
            Environment.GetEnvironmentVariable("PRODUCTMASTERDATA_TEST_AUDIT_POSTGRES"));
        Assert.Equal("audit_test", connection.Database);
        Assert.Equal("127.0.0.1", connection.Host);
        var options = new DbContextOptionsBuilder<ProductMasterDataDbContext>()
            .UseNpgsql(connection.ConnectionString)
            .Options;

        Guid eventId;
        await using (var database = new ProductMasterDataDbContext(options))
        {
            await database.Database.MigrateAsync();
            var auditRecordId = Guid.NewGuid();
            var actorId = Guid.NewGuid();
            database.Users.Add(new ApplicationUser
            {
                Id = actorId,
                UserName = $"audit-{Guid.NewGuid():N}"
            });
            var appendOnlyEvent = AuditEvent.Create(
                actorId,
                action: "records.created",
                target: $"product_records/{auditRecordId:D}",
                outcome: "succeeded",
                correlationId: Guid.NewGuid().ToString("N"),
                metadataJson: JsonSerializer.Serialize(new { recordId = auditRecordId }));
            database.AuditEvents.Add(appendOnlyEvent);
            await database.SaveChangesAsync();
            eventId = appendOnlyEvent.EventId;

            await Assert.ThrowsAsync<PostgresException>(() => database.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE audit_events SET outcome = {"tampered"} WHERE event_id = {eventId}"));
            await Assert.ThrowsAsync<PostgresException>(() => database.Database.ExecuteSqlInterpolatedAsync(
                $"DELETE FROM audit_events WHERE event_id = {eventId}"));
            await Assert.ThrowsAsync<PostgresException>(() =>
                database.Database.ExecuteSqlRawAsync("TRUNCATE TABLE audit_events"));
            var actorDeleteError = await Assert.ThrowsAsync<PostgresException>(() =>
                database.Database.ExecuteSqlInterpolatedAsync(
                    $"DELETE FROM \"AspNetUsers\" WHERE \"Id\" = {actorId}"));
            Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, actorDeleteError.SqlState);
            Assert.Equal(actorId, await database.AuditEvents
                .AsNoTracking()
                .Where(auditEvent => auditEvent.EventId == eventId)
                .Select(auditEvent => auditEvent.ActorId)
                .SingleAsync());

            var existingCode = $"PG-AUDIT-{Guid.NewGuid():N}";
            database.ProductRecords.Add(new ProductRecord { MCode = existingCode });
            await database.SaveChangesAsync();

            var rejectedRecord = new ProductRecord { MCode = existingCode };
            database.ProductRecords.Add(rejectedRecord);
            database.AuditEvents.Add(AuditEvent.Create(
                actorId: null,
                action: "records.created",
                target: $"product_records/{rejectedRecord.Id:D}",
                outcome: "succeeded",
                correlationId: Guid.NewGuid().ToString("N"),
                metadataJson: JsonSerializer.Serialize(new { recordId = rejectedRecord.Id })));
            await Assert.ThrowsAsync<DbUpdateException>(() => database.SaveChangesAsync());

            await using var verification = new ProductMasterDataDbContext(options);
            Assert.Equal(1, await verification.ProductRecords.CountAsync(record => record.MCode == existingCode));
            Assert.False(await verification.AuditEvents.AnyAsync(auditEvent =>
                auditEvent.Target == $"product_records/{rejectedRecord.Id:D}"));
        }
    }
}

internal sealed class AuditPostgresFactAttribute : FactAttribute
{
    public AuditPostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PRODUCTMASTERDATA_TEST_AUDIT_POSTGRES")))
        {
            Skip = "Set PRODUCTMASTERDATA_TEST_AUDIT_POSTGRES to a dedicated disposable PostgreSQL audit_test database to run this provider test.";
        }
    }
}
