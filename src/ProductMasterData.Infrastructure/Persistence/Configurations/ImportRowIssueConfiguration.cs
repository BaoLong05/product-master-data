using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProductMasterData.Domain.Imports;

namespace ProductMasterData.Infrastructure.Persistence.Configurations;

public sealed class ImportRowIssueConfiguration : IEntityTypeConfiguration<ImportRowIssue>
{
    public void Configure(EntityTypeBuilder<ImportRowIssue> builder)
    {
        builder.ToTable("import_row_errors");
        builder.HasKey(issue => issue.Id);
        builder.Property(issue => issue.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(issue => issue.BatchId).HasColumnName("batch_id").IsRequired();
        builder.Property(issue => issue.RowNumber).HasColumnName("source_row_number").IsRequired();
        builder.Property(issue => issue.Code).HasColumnName("error_code").HasMaxLength(64).IsRequired();
        builder.HasIndex(issue => new { issue.BatchId, issue.RowNumber, issue.Code })
            .IsUnique()
            .HasDatabaseName("ux_import_row_errors_batch_row_code");
    }
}
