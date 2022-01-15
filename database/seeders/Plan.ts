import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Plan from 'App/Models/Plan'

export default class PlanSeeder extends BaseSeeder {
  public async run() {
    await Plan.createMany([
      {
        id: 'plan_0001',
        slug: 'free',
        title: 'Free',
      },
      {
        id: 'plan_0002',
        slug: 'pro',
        title: 'Pro',
        stripePriceId: 'price_1JfTXBHh92iCAESpBbZiA0Ms',
      },
      {
        id: 'plan_0003',
        slug: 'teams',
        title: 'Teams',
        stripePriceId: 'price_1JfTXBHh92iCAESpHznYpWVX',
      },
    ])
  }
}
