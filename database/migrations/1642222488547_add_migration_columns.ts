import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class AddMigrationColumns extends BaseSchema {
  protected tableName = 'add_migration_columns'

  public async up() {
    this.schema.alterTable('users', (table) => {
      table.string('cognito_id').nullable()
      table.string('ddb_uuid').nullable()
    })

    this.schema.alterTable('virtual_networks', (table) => {
      table.string('ddb_uuid').nullable()
    })

    this.schema.alterTable('devices', (data) => {
      data.string('ddb_uuid').nullable()
    })
  }

  public async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('ddb_uuid')
    })

    this.schema.alterTable('virtual_networks', (table) => {
      table.dropColumn('ddb_uuid')
    })

    this.schema.alterTable('devices', (data) => {
      data.dropColumn('ddb_uuid')
    })
  }
}
