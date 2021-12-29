import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Server from 'App/Models/Server'

export default class ServersController {
  public async list({ response }: HttpContextContract) {
    return response.format(200, await Server.all())
  }
}
