import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { RequestContract } from '@ioc:Adonis/Core/Request'
import { ResponseContract } from '@ioc:Adonis/Core/Response'
import { schema } from '@ioc:Adonis/Core/Validator'
import { LucidModel } from '@ioc:Adonis/Lucid/Orm'
import Device from 'App/Models/Device'
import Plan from 'App/Models/Plan'
import User from 'App/Models/User'
import UserVirtualNetwork from 'App/Models/UserVirtualNetwork'
import VirtualNetwork from 'App/Models/VirtualNetwork'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import { DateTime } from 'luxon'

export default class AdminsController {
  public async planCount({ request, response }: HttpContextContract) {
    const requestSchema = schema.create({
      start: schema.date.optional({ format: "yyyy-MM-dd'T'HH:mm:ss.SSSZ" }),
      end: schema.date.optional({ format: "yyyy-MM-dd'T'HH:mm:ss.SSSZ" }),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    let queryRes: User[]
    if (payload.start == null) {
      queryRes = await User.query().select('plan_id').groupBy('plan_id').count('plan_id as plan_count')
    } else if (payload.end == null) {
      queryRes = await User.query()
        .select('plan_id')
        .groupBy('plan_id')
        .count('plan_id as plan_count')
        .whereBetween('created_at', [payload.start.toString(), DateTime.now().toString()])
    } else {
      queryRes = await User.query()
        .select('plan_id')
        .groupBy('plan_id')
        .count('plan_id as plan_count')
        .whereBetween('created_at', [payload.start.toString(), payload.end.toString()])
    }
    const result = {}
    for (const element of queryRes) {
      const plan = await Plan.find(element.planId)
      if (!plan) continue
      result[plan.title] = element.$extras.plan_count
    }
    response.format(200, result)
  }

  public async userInfo({ request, response }: HttpContextContract) {
    const requestSchema = schema.create({
      email: schema.string(),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    const user = await User.query().where('email', payload.email).first()
    if (user == null) {
      throw new Error('User not found')
    }

    const vnInfo = await UserVirtualNetwork.query().count('* as count').where('user_id', user.id)
    const vnCount = vnInfo[0].$extras.count

    const deviceInfo = await Device.query().count('* as count').where('user_id', user.id)
    const deviceCount = deviceInfo[0].$extras.count

    const result = {
      email: user.email,
      name: user.name,
      plan_id: user.planId,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      device_count: deviceCount,
      virtual_network_count: vnCount,
    }
    response.format(200, result)
  }

  public async userCount({ request, response }: HttpContextContract) {
    await this.count(request, response, User)
  }

  public async deviceCount({ request }: HttpContextContract) {
    const requestSchema = schema.create({
      start: schema.date.optional(),
      end: schema.date.optional(),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    const query = Device.query()
    if (payload.start) {
      query.where('created_at', '>=', payload.start.toString())
    }
    if (payload.end) {
      query.where('created_at', '<=', payload.end.toString())
    }

    let total = 0
    const result = await query.select('platform').count('* as count').groupBy('platform')

    const platforms = ['Windows', 'MacOS', 'Linux', 'Android', 'iOS', 'Others']
    const counts: any = platforms.reduce((acc, curr) => {
      acc[curr] = 0
      return acc
    }, {})

    result.forEach((item) => {
      const platform =
        platforms.find((platform) => item.platform.toLowerCase().includes(platform.toLowerCase())) ||
        platforms[platforms.length - 1]
      counts[platform] += parseInt(item.$extras.count)
      total += parseInt(item.$extras.count)
    })

    return {
      total: total,
      platforms: Object.entries(counts).map(([key, value]) => ({
        name: key,
        count: value,
      })),
    }
  }

  public async virtualNetworkCount({ request, response }: HttpContextContract) {
    await this.count(request, response, VirtualNetwork)
  }

  private async count(request: RequestContract, response: ResponseContract, model: LucidModel) {
    const requestSchema = schema.create({
      start: schema.date.optional(),
      end: schema.date.optional(),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    if (payload.start == null) {
      const res = await model.query().count('* as count')
      const count = res[0].$extras.count
      response.format(200, count)
    } else if (payload.end == null) {
      const counts = await model
        .query()
        .count('* as count')
        .whereBetween('created_at', [payload.start.toString(), DateTime.now().toString()])
      response.format(200, counts[0].$extras.count)
    } else {
      const counts = await model
        .query()
        .count('* as count')
        .whereBetween('created_at', [payload.start.toString(), payload.end.toString()])
      response.format(200, counts[0].$extras.count)
    }
  }
}
