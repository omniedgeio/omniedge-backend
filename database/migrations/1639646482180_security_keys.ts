import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class SecurityKeys extends BaseSchema {
  protected tableName = 'security_keys'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('user_id').unsigned().references('id').inTable('users')
      table.string('name').notNullable()
      table.string('type').notNullable()
      table.string('key', 72).notNullable().unique()

      table.timestamp('expires_at', { useTz: true }).nullable()

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
