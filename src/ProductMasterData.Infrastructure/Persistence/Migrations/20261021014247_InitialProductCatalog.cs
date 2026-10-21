using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductMasterData.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialProductCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "product_records",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    date_value = table.Column<string>(type: "text", nullable: true),
                    company_name = table.Column<string>(type: "text", nullable: true),
                    item_name = table.Column<string>(type: "text", nullable: true),
                    m_code = table.Column<string>(type: "text", nullable: true),
                    item_code = table.Column<string>(type: "text", nullable: true),
                    product_type = table.Column<string>(type: "text", nullable: true),
                    product_status = table.Column<string>(type: "text", nullable: true),
                    approval_status = table.Column<string>(type: "text", nullable: true),
                    sample_or_production_order = table.Column<string>(type: "text", nullable: true),
                    company_name_letters = table.Column<string>(type: "text", nullable: true),
                    old_region = table.Column<string>(type: "text", nullable: true),
                    sample_saved_date = table.Column<string>(type: "text", nullable: true),
                    pic_image = table.Column<string>(type: "text", nullable: true),
                    purchase_order = table.Column<string>(type: "text", nullable: true),
                    production_order_pdf = table.Column<string>(type: "text", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    printed_at = table.Column<string>(type: "text", nullable: true),
                    disc_name = table.Column<string>(type: "text", nullable: true),
                    soi = table.Column<string>(type: "text", nullable: true),
                    maso = table.Column<string>(type: "text", nullable: true),
                    denier = table.Column<string>(type: "text", nullable: true),
                    price = table.Column<string>(type: "text", nullable: true),
                    region = table.Column<string>(type: "text", nullable: true),
                    quantity = table.Column<string>(type: "text", nullable: true),
                    pic_url = table.Column<string>(type: "text", nullable: true),
                    internal_item = table.Column<string>(type: "text", nullable: true),
                    request = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    version = table.Column<long>(type: "bigint", nullable: false, defaultValue: 1L)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_records", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_product_records_active_updated_at",
                table: "product_records",
                columns: new[] { "is_deleted", "updated_at" },
                descending: new[] { false, true },
                filter: "is_deleted = FALSE");

            migrationBuilder.CreateIndex(
                name: "ux_product_records_m_code_non_empty",
                table: "product_records",
                column: "m_code",
                unique: true,
                filter: "m_code IS NOT NULL AND m_code <> ''");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "product_records");
        }
    }
}
