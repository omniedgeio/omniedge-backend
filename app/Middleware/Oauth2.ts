import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import OmniedgeException from 'App/Exceptions/OmniedgeException'
import Oauth2Token from 'App/Models/Oauth2Token'

export default class Oauth2Middleware {
  // https://datatracker.ietf.org/doc/html/rfc6750
  public async handle({ request }: HttpContextContract, next: () => Promise<void>) {
    const authorization = request.header('Authorization');
    if (!authorization) {
      throw new OmniedgeException(401, '401', 'Not authorized', null)
    }

    const [type, accessToken] = authorization.split(' ');
    if (type.toLocaleLowerCase() !== 'bearer') {
      throw new OmniedgeException(401, '401', 'Not authorized', null)
    }
   
    const record = await Oauth2Token.findBy('access_token', accessToken)
    if (!record) {
      throw new OmniedgeException(401, '401', 'Not authorized', null)
    }

    if (record.accssTokenIsExpired()) {
      throw new OmniedgeException(401, '401', 'Not authorized', null)
    }
    await next()
  }
}
