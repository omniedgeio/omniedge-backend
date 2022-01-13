import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class VirtualNetworksController {
  public async list({ request, response, auth }: HttpContextContract) {
    const virtualNetworks = await auth.user
      ?.related('virtualNetworks')
      .query()
      .filter(request.qs())
      .withAggregate('users', (query) => {
        query.count('*').as('users_count')
      })
      .withAggregate('devices', (query) => {
        query.count('*').as('devices_count')
      })
      .preload('devices')
      .preload('users')
      .preload('server')

    return response.format(200, virtualNetworks)
  }

  public async retrieve({ params, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .withAggregate('users', (query) => {
        query.count('*').as('users_count')
      })
      .withAggregate('devices', (query) => {
        query.count('*').as('devices_count')
      })
      .preload('server')
      .preload('devices')
      .preload('users')
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    return response.format(200, virtualNetwork.serialize())
  }
}
