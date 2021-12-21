import BaseSchema from "@ioc:Adonis/Lucid/Schema";
import { UserRole } from "../../contracts/enum";

export default class UserVirtualNetwork extends BaseSchema {
  protected tableName = "user_virtual_network";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements("id");
      table.string("user_id", 24).references("id").inTable("users");

      table
        .string("virtual_network_id", 24)
        .references("id")
        .inTable("virtual_networks");

      table.tinyint("role").notNullable().defaultTo(UserRole.User);

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
