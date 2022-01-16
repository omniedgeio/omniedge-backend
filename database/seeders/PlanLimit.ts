import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Plan from 'App/Models/Plan'

export default class PlanLimitSeeder extends BaseSeeder {
  public async run() {
    const free = await Plan.findBy('slug', 'free')

    free?.related('limits').createMany([
      {
        key: 'virtual-networks',
        defaultLimit: 1,
      },
      {
        key: 'devices',
        defaultLimit: 20,
      },
      {
        key: 'user-virtual-network',
        defaultLimit: 1,
      },
    ])

    const pro = await Plan.findBy('slug', 'pro')

    pro?.related('limits').createMany([
      {
        key: 'virtual-networks',
        defaultLimit: 5,
      },
      {
        key: 'devices',
        defaultLimit: 25,
      },
      {
        key: 'user-virtual-network',
        defaultLimit: 5,
      },
    ])

    const team = await Plan.findBy('slug', 'teams')

    team?.related('limits').createMany([
      {
        key: 'virtual-networks',
        defaultLimit: 10,
      },
      {
        key: 'devices',
        defaultLimit: 25,
      },
      {
        key: 'user-virtual-network',
        defaultLimit: 10,
      },
    ])
  }
}
