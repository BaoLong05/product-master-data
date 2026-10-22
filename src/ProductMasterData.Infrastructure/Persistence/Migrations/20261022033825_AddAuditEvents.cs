using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductMasterData.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_events",
                columns: table => new
                {
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: true),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    action = table.Column<string>(type: "text", nullable: false),
                    target = table.Column<string>(type: "text", nullable: false),
                    outcome = table.Column<string>(type: "text", nullable: false),
                    correlation_id = table.Column<string>(type: "text", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_events", x => x.event_id);
                    table.ForeignKey(
                        name: "fk_audit_events_actor_id",
                        column: x => x.actor_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_events_actor_id",
                table: "audit_events",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "ix_audit_events_target_occurred_at",
                table: "audit_events",
                columns: new[] { "target", "occurred_at" },
                descending: new[] { false, true });

            migrationBuilder.Sql(
                """
                CREATE FUNCTION prevent_audit_events_mutation()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $$
                BEGIN
                    RAISE EXCEPTION 'audit_events is append-only';
                END;
                $$;

                CREATE TRIGGER trg_audit_events_append_only
                BEFORE UPDATE OR DELETE ON audit_events
                FOR EACH ROW
                EXECUTE FUNCTION prevent_audit_events_mutation();

                CREATE TRIGGER trg_audit_events_no_truncate
                BEFORE TRUNCATE ON audit_events
                FOR EACH STATEMENT
                EXECUTE FUNCTION prevent_audit_events_mutation();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP TRIGGER IF EXISTS trg_audit_events_append_only ON audit_events;
                DROP TRIGGER IF EXISTS trg_audit_events_no_truncate ON audit_events;
                DROP FUNCTION IF EXISTS prevent_audit_events_mutation();
                """);

            migrationBuilder.DropTable(
                name: "audit_events");
        }
    }
}
