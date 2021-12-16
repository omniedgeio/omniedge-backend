import BaseSchema from "@ioc:Adonis/Lucid/Schema";
import { UserStatus } from "./../../contracts/enum";

export default class Users extends BaseSchema {
  protected tableName = "users";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string("id", 24).primary();

      table.string("name", 255).notNullable();
      table.string("email", 255).notNullable();
      table.timestamp("email_verified_at");

      table.string("password", 60);
      table.text("picture");
      table.string("last_login_ip", 40);
      table.timestamp("last_login_at");

      table.tinyint("status").notNullable().defaultTo(UserStatus.Active);
      table.timestamp("blocked_at");

      table.index(["email"]);

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
