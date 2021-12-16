import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class Devices extends BaseSchema {
  protected tableName = "devices";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string("id", 24).primary();

      table.string("user_id", 24).notNullable().references("id");

      table.string("hardware_id", 100).notNullable();
      table.string("platform", 100).notNullable();
      table.string("name", 255).notNullable();

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
