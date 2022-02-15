import Env from '@ioc:Adonis/Core/Env'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import OmniedgeException from 'App/Exceptions/OmniedgeException'

export default class AdminAuth {
  public async handle({ request }: HttpContextContract, next: () => Promise<void>) {
    if (request.header('x-api-key') != Env.get('ADMIN_API_KEY')) {
      throw new OmniedgeException(401, '401', 'Not authorized', null)
    }
    // code for middleware goes here. ABOVE THE NEXT CALL

    await next()
  }
}
