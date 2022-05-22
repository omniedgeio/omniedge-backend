import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Oauth2AccessTokenGrantValidator from 'App/Validators/Oauth2AccessTokenGrantValidator'
import Oauth2AuthorizationCodeFlowValidator from 'App/Validators/Oauth2AuthorizationCodeFlowValidator'
import Oauth2client from 'App/Models/Oauth2Client'
import Oauth2Token from 'App/Models/Oauth2Token'
import Oauth2AuthorizationCode from 'App/Models/Oauth2AuthorizationCode'
import User from 'App/Models/User'
import { JWTTokenContract } from '@ioc:Adonis/Addons/Jwt'

export default class Oauth2sController {
  // https://www.oauth.com/oauth2-servers/access-tokens/refreshing-access-tokens/
  // https://www.oauth.com/oauth2-servers/access-tokens/client-credentials/
  public async accessToken({ request, response, auth }: HttpContextContract) {
    const clientCredential = await request.validate(Oauth2AccessTokenGrantValidator)
    const grantType = clientCredential.grant_type
    if (!['refresh_token', 'client_credentials', 'authorization_code'].includes(grantType)) {
      response.badRequest({ error: 'invalid grant_type' })
      return
    }

    let user: User | null = null
    let oauth2TokenRecord: Oauth2Token | null = null
    let jwtUserContract: JWTTokenContract<User> | null = null
    const client = await Oauth2client.findBy('client_id', clientCredential.client_id);
    if (!client) {
      response.badRequest({ error: 'invalid client' })
      return
    }

    if (client.clientSecret != clientCredential.client_screct) {
      response.badRequest({ error: 'invalid client' })
      return
    }

    if (grantType === 'client_credentials') {
      // check if client has already an access token
      const data = await Oauth2Token.query()
        .where('client_id', client.id)
        .where('grant_type', 'client_credentials')
        .first()

      if (data && !data.accssTokenIsExpired()) {
        response.badRequest({ error: 'repeat request to get access_token' })
        return
      }

      // create new access token
      oauth2TokenRecord = await Oauth2Token.create({
        clientId: client.clientId,
        grantType: 'client_credentials',
        accessToken: Oauth2Token.generateToken(),
        refreshToken: Oauth2Token.generateToken(),
        expiresIn: Oauth2Token.generateExpireAt(),
      });
    } else if (grantType === 'refresh_token') {
      if (!clientCredential.refresh_token) {
        response.badRequest({ error: 'invalid refresh_token' })
        return
      }

      oauth2TokenRecord = await Oauth2Token.findBy('refreshToken', clientCredential.refresh_token);
      if (!oauth2TokenRecord) {
        response.badRequest({
          error: 'invalid refresh_token'
        })
        return
      }
    } else if (grantType === 'authorization_code') {
      // check authorization_code is expired not yet
      const authorizationCodeRecord = await Oauth2AuthorizationCode.findBy('authorization_code', clientCredential.code)
      if (!authorizationCodeRecord || authorizationCodeRecord.authorizationCodeIsExpired()) {
        response.badRequest({ error: 'invalid authorization_code' })
        return
      }
      const userId = authorizationCodeRecord.userId

      // check if client has already an access token
      const data = await Oauth2Token.query()
        .where('user_id', userId)
        .where('grant_type', 'authorization_code')
        .first()
      if (data && !data.accssTokenIsExpired()) {
        response.badRequest({ error: 'repeat request to get access_token' })
        return
      } else {
        user = await User.find(userId)
        if (!user) {
          response.badRequest({ error: 'invalid user' })
          return
        }
      }
    }

    if (grantType === 'authorization_code' && user) {
      jwtUserContract = await auth.use('jwt').generate(user, {
        expiresIn: process.env.LOGIN_TOKEN_EXPIRE
      })
    } else if (grantType === 'refresh_token') {
      if (oauth2TokenRecord?.userId) {
        user = await User.find(oauth2TokenRecord.userId)
        if (user) {
          jwtUserContract = await auth.use('jwt').generate(user, {
            expiresIn: process.env.LOGIN_TOKEN_EXPIRE
          })
        }
      }
    }

    if (jwtUserContract) {
      // create new access token.
      oauth2TokenRecord = await Oauth2Token.create({
        accessToken: jwtUserContract.accessToken,
        refreshToken: jwtUserContract.refreshToken,
        expiresIn: jwtUserContract.expiresIn,
        clientId: client.clientId,
        grantType: grantType,
        userId: user?.id
      });
    }

    if (oauth2TokenRecord?.$isPersisted) {
      response.format(200, {
        access_token: oauth2TokenRecord.accessToken,
        refresh_token: oauth2TokenRecord.refreshToken,
        expires_in: oauth2TokenRecord.expiresIn,
        token_type: 'bearer'
      })
    } else {
      response.internalServerError({
        error: 'failed to create access_token'
      })
    }
  }

  public async authorize({ request, response, auth }: HttpContextContract) {
    if (!auth.user) {
      // TODO: redirect to login page
      // this will be a new login page.
      return
    }

    const authorizationReq = await request.validate(Oauth2AuthorizationCodeFlowValidator);
    if (authorizationReq.response_type !== 'code') {
      response.badRequest({ error: 'invalid response_type' })
      return
    }

    const client = await Oauth2client.findBy('client_id', authorizationReq.client_id);
    if (!client) {
      response.badRequest({ error: 'invalid client' })
      return
    }

    const record = await Oauth2AuthorizationCode.create({
      clientId: client.clientId,
      userId: auth.user.id.toString(),
      authorizationCode: Oauth2AuthorizationCode.generateAuthorizationCode(),
      expiresIn: Oauth2AuthorizationCode.generateExpireAt(),
    });

    if (record.$isPersisted) {
      response.format(200, {
        code: record.authorizationCode
      })
    } else {
      response.internalServerError({
        error: 'failed to create authorization_code'
      })
    }
  }
}
