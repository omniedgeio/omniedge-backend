import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class PasswordResets extends BaseSchema {
  protected tableName = "password_resets";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements("id");

      table.string("user_id", 24).notNullable().references("id");
      table.string("token", 100).notNullable();

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp("created_at", { useTz: true });
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
