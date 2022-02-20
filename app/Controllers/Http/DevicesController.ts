import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import Device from 'App/Models/Device'
import VirtualNetworkDevice from 'App/Models/VirtualNetworkDevice'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import { UsageKey } from 'Contracts/enum'

export default class DevicesController {
  public async register({ request, response, auth }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [rules.required(), rules.maxLength(255)]),
        hardware_uuid: schema.string({ trim: true }, [rules.required()]),
        platform: schema.string({ trim: true }, [rules.required(), rules.maxLength(100)]),
      }),
      reporter: CustomReporter,
    })

    const user = auth.user!

    const limit = await user.getLimit(UsageKey.Devices)
    const usage = await user.getUsage(UsageKey.Devices)
    if (usage >= limit) {
      return response.format(400, 'You have reached the limit of devices')
    }

    const device = await Device.firstOrCreate({
      userId: auth.user!.id,
      name: data.name,
      hardwareId: data.hardware_uuid.toLowerCase(),
      platform: data.platform,
    })

    return response.format(200, device)
  }

  public async list({ request, response, auth }: HttpContextContract) {
    const devices = await auth.user
      ?.related('devices')
      .query()
      .filter(request.qs())
      .preload('virtualNetworks', (query) => query.select('id', 'name'))
      .paginate(
        Math.round(Math.max(request.input('page') || 1, 1)),
        Math.round(Math.max(request.input('per_page') || 10, 10))
      )

    return response.format(200, devices?.serialize())
  }

  public async retrieve({ params, response, auth }: HttpContextContract) {
    const device = await auth.user
      ?.related('devices')
      .query()
      .preload('virtualNetworks', (query) => query.select('id', 'name'))
      .where('devices.id', params.id)
      .first()

    if (!device) {
      return response.format(404, 'Device not found')
    }

    return response.format(200, device)
  }

  public async update({ request, params, response, auth }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [rules.required(), rules.maxLength(255)]),
      }),
    })

    const device = await auth.user?.related('devices').query().where('devices.id', params.id).first()

    if (!device) {
      return response.format(404, 'Device not found')
    }

    device.name = data.name

    await device.save()

    return response.format(200, device)
  }

  public async delete({ params, response, auth }: HttpContextContract) {
    const device = await auth.user?.related('devices').query().where('devices.id', params.id).first()

    if (!device) {
      return response.format(404, 'Device not found')
    }

    await VirtualNetworkDevice.query().where('device_id', params.id).delete()

    await device.delete()

    return response.format(200, 'Device deleted successfully')
  }
}
