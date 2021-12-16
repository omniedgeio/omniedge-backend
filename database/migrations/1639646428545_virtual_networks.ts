import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class VirtualNetworks extends BaseSchema {
  protected tableName = "virtual_networks";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string("id", 24).primary();

      table.string("name", 255).notNullable();
      table.string("ip_range", 18).notNullable();

      table.string("server_id").references("id").inTable("servers");

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
