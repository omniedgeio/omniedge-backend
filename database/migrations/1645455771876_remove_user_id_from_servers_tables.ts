import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class RemoveUserIdFromServersTables extends BaseSchema {
  protected tableName = 'servers'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('user_id')
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('user_id').references('id').inTable('users').nullable()
    })
  }
}
