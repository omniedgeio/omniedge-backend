import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import { DateTime } from 'luxon'
import Device from 'App/Models/Device'
import VirtualNetwork from 'App/Models/VirtualNetwork'
import { ResponseContract } from '@ioc:Adonis/Core/Response'
import { LucidModel } from '@ioc:Adonis/Lucid/Orm'
import { RequestContract } from '@ioc:Adonis/Core/Request'
import UserVirtualNetwork from 'App/Models/UserVirtualNetwork'
import { AuthContract } from '@ioc:Adonis/Addons/Auth'

export default class AdminsController {

  public async planCount({ auth, request, response }: HttpContextContract) {
    await this.checkAdmin(auth)
    const requestSchema = schema.create({
      start: schema.date.optional({ format: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSZ' }),
      end: schema.date.optional({ format: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSZ' }),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    let queryRes: User[]
    if (payload.start == null) {
      queryRes = await User.query().select('plan_id').groupBy('plan_id')
        .count('plan_id as plan_count')
    } else if (payload.end == null) {
      queryRes = await User.query().select('plan_id').groupBy('plan_id')
        .count('plan_id as plan_count')
        .whereBetween('created_at', [payload.start.toString(), DateTime.now().toString()])
    } else {
      queryRes = await User.query().select('plan_id').groupBy('plan_id')
        .count('plan_id as plan_count')
        .whereBetween('created_at', [payload.start.toString(), payload.end.toString()])
    }
    const result = {}
    queryRes.forEach(element => {
      result[element.$original.planId] = element.$extras.plan_count
    })
    response.format(200, result)
  }

  public async userInfo({ auth, request, response }: HttpContextContract) {
    await this.checkAdmin(auth)
    const requestSchema = schema.create({
      email: schema.string(),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    const user = await User.query().where('email', payload.email).first()
    if (user == null) {
      throw new Error('User not found')
    }

    const vnInfo = await UserVirtualNetwork.query()
      .count('* as count')
      .where('user_id', user.id)
    const vnCount = vnInfo[0].$extras.count

    const deviceInfo = await Device.query()
      .count('* as count')
      .where('user_id', user.id)
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

  public async userCount({ auth, request, response }: HttpContextContract) {
    await this.checkAdmin(auth)
    await this.count(request, response, User)
  }

  public async deviceCount({ auth, request, response }: HttpContextContract) {
    await this.checkAdmin(auth)
    await this.count(request, response, Device)
  }

  public async virtualNetworkCount({ auth, request, response }: HttpContextContract) {
    await this.checkAdmin(auth)
    await this.count(request, response, VirtualNetwork)
  }

  private async checkAdmin(auth: AuthContract) {
    const user = await auth.use('admin').authenticate()
    if (user == null) {
      throw new Error('Not admin')
    }
    const payload = await auth.use('admin').payload
    console.log(payload)
    if (!payload || !payload.user || payload!!.user.name != 'admin') {
      throw new Error('Not admin')
    }
  }

  private async count(request: RequestContract, response: ResponseContract, model: LucidModel) {
    const requestSchema = schema.create({
      start: schema.date.optional({ format: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSZ' }),
      end: schema.date.optional({ format: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSZ' }),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    if (payload.start == null) {
      const res = await model.query().count('* as count')
      const count = res[0].$extras.count
      response.format(200, count)
    } else if (payload.end == null) {
      const counts = await model.query()
        .count('* as count')
        .whereBetween('created_at', [payload.start.toString(), DateTime.now().toString()])
      response.format(200, counts[0].$extras.count)
    } else {
      const counts = await model.query()
        .count('* as count')
        .whereBetween('created_at', [payload.start.toString(), payload.end.toString()])
      response.format(200, counts[0].$extras.count)
    }
  }
}

