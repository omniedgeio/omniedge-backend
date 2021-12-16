import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class Identities extends BaseSchema {
  protected tableName = "identities";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements("id");

      table.string("user_id", 24).notNullable().references("id");
      table.string("provider").notNullable();
      table.string("provider_user_id").notNullable();

      table.jsonb("metadata");

      table.index(["user_id", "provider"]);
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
