import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class DevicesController {
  public async list({ response, auth }: HttpContextContract) {
    const devices = await auth.user
      ?.related('devices')
      .query()
      .preload('virtualNetworks', (query) => query.select('id', 'name'))

    return response.format(200, devices)
  }
}
