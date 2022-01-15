import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Plan from 'App/Models/Plan'

export default class PlanSeeder extends BaseSeeder {
  public async run() {
    await Plan.createMany([
      {
        slug: 'free',
        title: 'Free',
      },
      {
        slug: 'pro',
        title: 'Pro',
        stripePriceId: 'price_1JfTXBHh92iCAESpBbZiA0Ms',
      },
      {
        slug: 'teams',
        title: 'Teams',
        stripePriceId: 'price_1JfTXBHh92iCAESpHznYpWVX',
      },
    ])
  }
}
