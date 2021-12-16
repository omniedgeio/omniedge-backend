import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class SecurityKeys extends BaseSchema {
  protected tableName = "security_keys";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string("id", 24).primary();

      table.string("user_id", 24).references("id").inTable("users");

      table.string("hash", 60).notNullable();

      table.string("lstr", 10).notNullable();
      table.tinyint("key_type").notNullable();

      table.timestamp("expired_at");

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
