import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Server from 'App/Models/Server'
import { Country } from 'Contracts/enum'

export default class ServerSeeder extends BaseSeeder {
  public async run() {
    await Server.createMany([
      {
        name: 'Hong Kong',
        host: 'dev-supernode-hk.edgecomputing.network:7787',
        country: Country.HongKong,
      },
      {
        name: 'Singapore',
        host: 'dev-supernode-sg.edgecomputing.network:7787',
        country: Country.Singapore,
      },
      {
        name: 'United States',
        host: 'dev-supernode-us.edgecomputing.network:7787',
        country: Country.UnitedStates,
      },
      {
        name: 'Germany',
        host: 'dev-supernode-de.edgecomputing.network:7787',
        country: Country.Germany,
      },
    ])
  }
}
