import BaseSchema from "@ioc:Adonis/Lucid/Schema";
import { InvitationStatus } from "./../../contracts/enum";

export default class Invitations extends BaseSchema {
  protected tableName = "invitations";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string("id", 24).primary();

      // User who got the invitation
      table.string("invited_user_id", 24).references("id").inTable("users");

      // User who sent the invitation
      table.string("invited_by_user_id", 24).references("id").inTable("users");

      table
        .string("virtual_network_id", 24)
        .references("id")
        .inTable("virtual_networks");

      table.tinyint("status").defaultTo(InvitationStatus.Pending);

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp("created_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true });
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
