import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'bonus_limits'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.string('user_id').notNullable()
      table.integer('device_limit').defaultTo(0)
      table.integer('network_limit').defaultTo(0)
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      table.index('user_id')
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
