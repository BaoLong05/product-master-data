using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductMasterData.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AllowRepeatedMCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_product_records_m_code_non_empty",
                table: "product_records");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ux_product_records_m_code_non_empty",
                table: "product_records",
                column: "m_code",
                unique: true,
                filter: "m_code IS NOT NULL AND m_code <> ''");
        }
    }
}
