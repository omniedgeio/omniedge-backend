import { BaseCommand } from '@adonisjs/core/build/standalone'
import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
import { DateTime } from 'luxon'

export default class UpdateToLark extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'update:lark'

  /**
   * Command description is displayed in the "help" output
   */
  public static description = ''

  public static settings = {
    /**
     * Set the following value to true, if you want to load the application
     * before running the command. Don't forget to call `node ace generate:manifest`
     * afterwards.
     */
    loadApp: true,

    /**
     * Set the following value to true, if you want this command to keep running until
     * you manually decide to exit the process. Don't forget to call
     * `node ace generate:manifest` afterwards.
     */
    stayAlive: false,
  }

  public async run() {
    const { default: User } = await import('App/Models/User')
    const { default: Device } = await import('App/Models/Device')
    const { default: VirtualNetwork } = await import('App/Models/VirtualNetwork')
    const userCountQuery = await User.query().count('id')
    const planUserCountQuery = await User.query().select('plan_id').groupBy('plan_id').count('id').preload('plan')

    const dailyNewUserQuery = await User.query()
      .where('created_at', '>', DateTime.now().minus({ days: 1 }).toString())
      .count('id')
    const dailyNewUser = dailyNewUserQuery[0].$extras.count

    const userCount = userCountQuery[0].$extras.count
    const planUserCount = planUserCountQuery.reduce((prev, item) => {
      prev[item.plan.title] = parseInt(item.$extras.count)
      return prev
    }, {})

    const deviceCountQuery = await Device.query().count('id')
    const deviceCount = deviceCountQuery[0].$extras.count

    const deviceByPlatformQuery = await Device.query()
      .select('platform')
      .groupBy('platform')
      .count('id as count')
      .orderBy('count', 'desc')

    const platforms = ['Windows', 'Android', 'Linux', 'macOS', 'iOS', 'Others']
    const deviceByPlatformCount = deviceByPlatformQuery.reduce(
      (prev, item) => {
        const platformFound = platforms.find((platform) => item.platform.toLowerCase().includes(platform.toLowerCase()))
        if (platformFound) {
          prev[platformFound] += parseInt(item.$extras.count)
        } else {
          prev['Others'] += parseInt(item.$extras.count)
        }
        return prev
      },
      platforms.reduce((acc, platform) => {
        acc[platform] = 0
        return acc
      }, {})
    )

    const virtualNetworkCountQuery = await VirtualNetwork.query().count('id')
    const virtualNetworkCount = virtualNetworkCountQuery[0].$extras.count

    const message = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            content: 'Daily Updates',
            tag: 'plain_text',
          },
        },
        elements: [
          {
            tag: 'div',
            text: {
              content:
                `**Total Users**: ${userCount || 0}\n` +
                `**New Users**: ${dailyNewUser || 0}\n` +
                `**Free Plan**: ${planUserCount['Free'] || 0}\n` +
                `**Pro Plan**: ${planUserCount['Pro'] || 0}\n` +
                `**Teams Plan**: ${planUserCount['Teams'] || 0}`,
              tag: 'lark_md',
            },
          },
          {
            tag: 'div',
            text: {
              content:
                `**Total Devices**: ${deviceCount || 0}\n` +
                Object.entries(deviceByPlatformCount)
                  .map(([platform, count]) => `**${platform}**: ${count}`)
                  .join('\n'),
              tag: 'lark_md',
            },
          },
          {
            tag: 'div',
            text: {
              content: `**Total Virtual Networks**: ${virtualNetworkCount || 0}`,
              tag: 'lark_md',
            },
          },
        ],
      },
    }
    await axios.post(Env.get('LARK_WEBHOOK_URL'), message)
  }
}
