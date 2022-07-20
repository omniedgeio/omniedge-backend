import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'referrals'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.string('referral_code').notNullable()
      table.string('user_id').references('id').inTable('users').onDelete('cascade')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      table.index('referral_code')
      table.index('user_id')
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
