import { BaseTask } from 'adonis5-scheduler/build'
import Logger from '@ioc:Adonis/Core/Logger'
import Plan from 'App/Models/Plan'
import User from 'App/Models/User'
import { DateTime } from 'luxon'

export default class ExpireSubscription extends BaseTask {
	public static get schedule() {
		return '0 0 1 * * *' // run every day at 1:00 AM
	}
	/**　
	 * Set enable use .lock file for block run retry task
	 * Lock file save to `build/tmpTaskLock`
	 */
	public static get useLock() {
		return true
	}

	public async handle() {
    let offset = 0
    const limit = 100

    const freePlan = await Plan.findBy('slug', 'free')
    const freePlanId = freePlan ? freePlan.id : null
    if (!freePlanId) {
      return
    }

		while(true) {
			const users = await User
        .query()
        .where('plan_id', '!=', freePlanId)
        .offset(offset)
        .limit(limit)
      if (users.length === 0) {
        break
      }

      for (const user of users) {
        const subscription = await user.getStripeSubcription();
        if (subscription?.current_period_end) {
          const endAt = DateTime.fromSeconds(subscription?.current_period_end);
          if (endAt.diffNow('days').days <= 0) {
            user.planId = freePlanId
            await user.save()
            Logger.info(`User ${user.id} expired subscription`)
          }
        }
      }

      offset += limit
		}
  }
}
