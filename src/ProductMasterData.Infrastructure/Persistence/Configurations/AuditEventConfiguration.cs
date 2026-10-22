using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProductMasterData.Domain.Audit;
using ProductMasterData.Infrastructure.Identity;

namespace ProductMasterData.Infrastructure.Persistence.Configurations;

public sealed class AuditEventConfiguration : IEntityTypeConfiguration<AuditEvent>
{
    public void Configure(EntityTypeBuilder<AuditEvent> builder)
    {
        builder.ToTable("audit_events");
        builder.HasKey(auditEvent => auditEvent.EventId);

        builder.Property(auditEvent => auditEvent.EventId)
            .HasColumnName("event_id")
            .ValueGeneratedNever();
        builder.Property(auditEvent => auditEvent.ActorId)
            .HasColumnName("actor_id");
        builder.Property(auditEvent => auditEvent.OccurredAt)
            .HasColumnName("occurred_at")
            .HasColumnType("timestamp with time zone")
            .IsRequired();
        builder.Property(auditEvent => auditEvent.Action)
            .HasColumnName("action")
            .HasColumnType("text")
            .IsRequired();
        builder.Property(auditEvent => auditEvent.Target)
            .HasColumnName("target")
            .HasColumnType("text")
            .IsRequired();
        builder.Property(auditEvent => auditEvent.Outcome)
            .HasColumnName("outcome")
            .HasColumnType("text")
            .IsRequired();
        builder.Property(auditEvent => auditEvent.CorrelationId)
            .HasColumnName("correlation_id")
            .HasColumnType("text")
            .IsRequired();
        builder.Property(auditEvent => auditEvent.MetadataJson)
            .HasColumnName("metadata")
            .HasColumnType("jsonb")
            .IsRequired();

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(auditEvent => auditEvent.ActorId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_audit_events_actor_id");

        builder.HasIndex(auditEvent => new { auditEvent.Target, auditEvent.OccurredAt })
            .HasDatabaseName("ix_audit_events_target_occurred_at")
            .IsDescending(false, true);
    }
}
