using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProductMasterData.Domain.Imports;
using ProductMasterData.Infrastructure.Identity;

namespace ProductMasterData.Infrastructure.Persistence.Configurations;

public sealed class ImportBatchConfiguration : IEntityTypeConfiguration<ImportBatch>
{
    public void Configure(EntityTypeBuilder<ImportBatch> builder)
    {
        builder.ToTable("import_batches");
        builder.HasKey(batch => batch.Id);
        builder.Property(batch => batch.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(batch => batch.InitiatingUserId).HasColumnName("initiating_user_id").IsRequired();
        builder.Property(batch => batch.SourceFileName).HasColumnName("source_file_name").HasColumnType("text").IsRequired();
        builder.Property(batch => batch.RequestFingerprint).HasColumnName("request_fingerprint").HasMaxLength(64).IsRequired();
        builder.Property(batch => batch.Status).HasColumnName("status").HasMaxLength(32).IsRequired();
        builder.Property(batch => batch.StartedAt).HasColumnName("started_at").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(batch => batch.CompletedAt).HasColumnName("completed_at").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(batch => batch.ScannedRows).HasColumnName("scanned_rows").IsRequired();
        builder.Property(batch => batch.ImportedRows).HasColumnName("imported_rows").IsRequired();
        builder.Property(batch => batch.SkippedRows).HasColumnName("skipped_rows").IsRequired();
        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(batch => batch.InitiatingUserId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_import_batches_initiating_user_id");
        builder.HasIndex(batch => new { batch.InitiatingUserId, batch.RequestFingerprint })
            .IsUnique()
            .HasDatabaseName("ux_import_batches_actor_fingerprint");
        builder.HasIndex(batch => batch.StartedAt)
            .IsDescending()
            .HasDatabaseName("ix_import_batches_started_at");
        builder.HasMany(batch => batch.Issues)
            .WithOne()
            .HasForeignKey(issue => issue.BatchId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("fk_import_row_issues_batch_id");
    }
}
