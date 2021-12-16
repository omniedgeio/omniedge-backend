import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class Servers extends BaseSchema {
  protected tableName = "servers";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string("id", 24).primary();

      table.string("name", 100).notNullable();
      table.string("host", 255).notNullable();

      table.string("country", 2).notNullable();

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
