import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Oauth2ClientCredential from 'App/Validators/Oauth2ClientCredentialValidator'
import Oauth2client from 'App/Models/Oauth2Client'
import Oauth2Token from 'App/Models/Oauth2Token'

export default class Oauth2sController {
  // https://www.oauth.com/oauth2-servers/access-tokens/refreshing-access-tokens/
  // https://www.oauth.com/oauth2-servers/access-tokens/client-credentials/
  public async accessToken({ request, response }: HttpContextContract) {
    const clientCredential = await request.validate(Oauth2ClientCredential);

    if (!['refresh_token', 'client_credentials'].includes(clientCredential.grant_type)) {
      response.badRequest({error: 'invalid grant_type'})
      return
    }

    const client = await Oauth2client.findBy('client_id', clientCredential.client_id);
    if (!client) {
      response.badRequest({error: 'invalid client'})
      return
    }

    if (client.clientSecret != clientCredential.client_screct) {
      response.badRequest({error: 'invalid client'})
      return
    }

    const accessToken = Oauth2Token.generateToken();
    const refreshToken = Oauth2Token.generateToken();
    const expiresIn = Oauth2Token.generateExpireAt();
    if (clientCredential.grant_type === 'client_credentials') {
      const record = await Oauth2Token.create({
        accessToken,
        refreshToken,
        expiresIn,
        clientId: client.clientId,
      });
      if (record.$isPersisted) {
        response.format(200, {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn
        })
      } else {
        response.internalServerError({
          error: 'failed to create access_token'
        })
      }
    } else {
      if (!clientCredential.refresh_token) {
        response.badRequest({error: 'invalid refresh_token'})
        return
      }

      const record = await Oauth2Token.findBy('refreshToken', clientCredential.refresh_token);
      if (record) {
        record.accessToken = accessToken;
        record.refreshToken = refreshToken;
        record.expiresIn = expiresIn;
        await record.save();
        response.format(200, {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn
        })
      } else {
        response.badRequest({
          error: 'invalid refresh_token'
        })
      }
    }
  }
}
