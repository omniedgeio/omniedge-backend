import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class VirtualNetworkDevices extends BaseSchema {
  protected tableName = "virtual_network_devices";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements("id");

      table.string("device_id", 24).references("id").inTable("devices");

      table
        .string("virtual_network_id", 24)
        .references("id")
        .inTable("virtual_networks");

      table.string("virtual_ip", 40).notNullable();

      table.timestamp("last_seen");

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
