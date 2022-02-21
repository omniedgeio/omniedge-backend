import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Server from 'App/Models/Server'
import VirtualNetwork from 'App/Models/VirtualNetwork'
import { ServerType } from 'Contracts/enum'

export default class ServersController {
  public async list({ response, auth }: HttpContextContract) {
    const user = auth.user!
    const serverIdsQuery = await VirtualNetwork.query()
      .innerJoin('user_virtual_network', 'user_virtual_network.virtual_network_id', 'virtual_networks.id')
      .where('user_virtual_network.user_id', user.id)
      .select('server_id')
    const serverIds = serverIdsQuery.map((row) => row.serverId)

    return response.format(200, await Server.query().where('type', ServerType.Default).orWhere('id', 'in', serverIds))
  }
}
