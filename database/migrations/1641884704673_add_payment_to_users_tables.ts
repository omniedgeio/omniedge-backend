import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class AddPaymentToUsersTables extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('plan_id', 25).references('id').inTable('plans').nullable()
      table.string('stripe_customer_id').nullable()
      table.string('stripe_subscription_id').nullable()
      table.timestamp('plan_expired_at').nullable()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('plan_id')
      table.dropColumn('stripe_customer_id')
      table.dropColumn('stripe_subscription_id')
      table.dropColumn('plan_expired_at')
    })
  }
}
