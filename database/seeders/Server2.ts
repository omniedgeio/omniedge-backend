import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Server from 'App/Models/Server'
import { Country } from 'Contracts/enum'

export default class ServerSeeder extends BaseSeeder {
  public async run() {
    await Server.createMany([
      {
        name: 'United States West',
        host: 'prod-uswest.edgecomputing.network:443',
        country: Country.UnitedStatesWest,
      },
      {
        name: 'United States East',
        host: 'prod-useast.edgecomputing.network:443',
        country: Country.UnitedStatesEast,
      },
      {
        name: 'Japan',
        host: 'prod-jp.edgecomputing.network:443',
        country: Country.Japan,
      },
      {
        name: 'India',
        host: 'prod-in.edgecomputing.network:443',
        country: Country.India,
      },
      {
        name: 'Brazil',
        host: 'prod-brazil.edgecomputing.network:443',
        country: Country.Brazil,
      },
      {
        name: 'Italy',
        host: 'prod-it.edgecomputing.network:443',
        country: Country.Italy,
      },
      {
        name: 'Australia',
        host: 'prod-au.edgecomputing.network:443',
        country: Country.Australia,
      },
    ])
  }
}
