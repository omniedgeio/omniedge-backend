import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class PlanLimits extends BaseSchema {
  protected tableName = 'plan_limits'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('plan_id', 25).references('id').inTable('plans')
      table.string('key')
      table.integer('default_limit')

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
