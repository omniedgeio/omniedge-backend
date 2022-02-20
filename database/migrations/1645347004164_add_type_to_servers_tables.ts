import BaseSchema from '@ioc:Adonis/Lucid/Schema'
import { ServerType } from 'Contracts/enum'

export default class AddTypeToServersTables extends BaseSchema {
  protected tableName = 'servers'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.tinyint('type').notNullable().defaultTo(ServerType.Default)
      table.string('name').alter()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('type')
    })
  }
}
