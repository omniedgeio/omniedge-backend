import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Server from 'App/Models/Server'
import { Country } from 'Contracts/enum'

export default class ServerSeeder extends BaseSeeder {
  public async run() {
    await Server.createMany([
      {
        name: 'Hong Kong',
        host: 'prod-hk.edgecomputing.network:7787',
        country: Country.HongKong,
      },
      {
        name: 'Singapore',
        host: 'prod-sg.edgecomputing.network:443',
        country: Country.Singapore,
      },
      {
        name: 'United States',
        host: 'prod-useast.edgecomputing.network:443',
        country: Country.UnitedStates,
      },
      {
        name: 'Germany',
        host: 'prod-de.edgecomputing.network:443',
        country: Country.Germany,
      }
    ])
  }
}
