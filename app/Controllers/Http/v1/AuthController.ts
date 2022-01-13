import Env from '@ioc:Adonis/Core/Env'
import Hash from '@ioc:Adonis/Core/Hash'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Logger from '@ioc:Adonis/Core/Logger'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import AuthException from 'App/Exceptions/AuthException'
import Identity from 'App/Models/Identity'
import SecurityKey from 'App/Models/SecurityKey'
import User from 'App/Models/User'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import { AuthType, UserStatus } from 'Contracts/enum'
import { OAuth2Client, TokenPayload } from 'google-auth-library'
import { DateTime } from 'luxon'
import { ErrorCode } from '../../../../utils/constant'
import { nanoid } from '../../../../utils/nanoid'

export default class AuthController {
  public async generateSession({ ws, response }: HttpContextContract) {
    const id = nanoid(30)
    const expiredAt = DateTime.now().plus({ minutes: 15 })
    ws.createAuthSession(id, expiredAt)
    return response.format(200, {
      id: id,
      auth_url: Env.get('CLIENT_URL') + '/login?auth_session_uuid=' + id,
      expired_at: expiredAt,
    })
  }

  public async loginWithPassword({ ws, request, response, auth }: HttpContextContract) {
    const authSchema = schema.create({
      email: schema.string({ trim: true }, [
        rules.email({
          sanitize: {
            lowerCase: true,
          },
        }),
      ]),
      password: schema.string({ trim: true }),
      auth_session_uuid: schema.string(),
    })
    const payload = await request.validate({ schema: authSchema, reporter: CustomReporter })
    const token = await auth.attempt(payload.email, payload.password, {
      expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
    })
    console.log(payload.auth_session_uuid)
    ws.notifyTokenResponse(payload.auth_session_uuid, token.accessToken)
    response.format(200, token)
  }

  public async loginWithSecurityKey({ ws, request, response, auth }: HttpContextContract) {
    const authSchema = schema.create({
      key: schema.string({ trim: true }),
      auth_session_uuid: schema.string(),
    })
    const payload = await request.validate({ schema: authSchema, reporter: CustomReporter })
    const keyLstr = payload.key.substring(0, 16)
    const sks = await SecurityKey.query().where('keyLstr', keyLstr)
    for (let sk of sks) {
      if (await Hash.verify(sk.key, payload.key)) {
        const user = await User.find(sk.userId)
        const token = await auth.use('jwt').generate(user!!, {
          expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
        })
        response.format(200, token)
        ws.notifyTokenResponse(payload.auth_session_uuid, token.accessToken)
        return
      }
    }
    response.formatError(401, ErrorCode.auth.E_TOKEN_INVALID, 'Invalid security key')
  }

  /**
   * if google payload's email exists in database
   * @param request
   * @param response
   * @param auth
   */
  public async loginWithGoogle({ ws, request, response, auth }: HttpContextContract) {
    const authSchema = schema.create({
      id_token: schema.string({ trim: true }),
      auth_session_uuid: schema.string(),
    })
    const requestPayload = await request.validate({ schema: authSchema, reporter: CustomReporter })
    const googlePayload = await this.verifyGoogleIdToken(requestPayload.id_token)
    if (!googlePayload) {
      response.formatError(401, ErrorCode.auth.E_GOOGLE_AUTH_FAIL, 'The google id_token may be invalid')
    }
    const googlePayloadSub = googlePayload?.sub!!

    const identity = await Identity.findBy('providerUserId', googlePayloadSub)

    // user has logged in the system before
    if (identity) {
      const user = await User.findOrFail(identity.userId)
      const token = await auth.use('jwt').generate(user, {
        expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
      })
      response.format(200, token)
      ws.notifyTokenResponse(requestPayload.auth_session_uuid, token.accessToken)
      return
    }
    const user = await User.findBy('email', googlePayload?.email)
    if (!user) {
      const newGoogleUser = new User()
      newGoogleUser.name = googlePayload?.name ?? ''
      newGoogleUser.email = googlePayload?.email!!
      newGoogleUser.password = ''
      newGoogleUser.picture = googlePayload?.picture ?? ''
      newGoogleUser.status = UserStatus.Active
      Logger.info('New google user %o, original payload is %o', newGoogleUser, googlePayload)

      const identity = new Identity()
      identity.provider = AuthType.Google
      identity.providerUserId = googlePayload.sub
      identity.metadata = JSON.stringify(googlePayload)
      Logger.info('New google user[identity] %o', newGoogleUser)

      await Database.transaction(async (tx) => {
        newGoogleUser.useTransaction(tx)
        const dbGoogleUser = await newGoogleUser.save()
        newGoogleUser.id = dbGoogleUser.id
        identity.userId = dbGoogleUser.id
        identity.useTransaction(tx)
        await identity.save()
      })
      const token = await auth.use('jwt').generate(newGoogleUser, {
        expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
      })
      response.format(200, token)
      ws.notifyTokenResponse(requestPayload.auth_session_uuid, token.accessToken)
    } else {
      response.formatError(
        403,
        ErrorCode.auth.E_GOOGLE_AUTH_FAIL,
        'The email which your google account binds is used in the system'
      )
    }
  }

  private async verifyGoogleIdToken(idToken: string): Promise<TokenPayload> {
    const googleClientId = process.env.GOOGLE_CLIENT_ID
    const client = new OAuth2Client(googleClientId)
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: googleClientId,
    })
    const payload = ticket.getPayload()
    if (payload == undefined) {
      throw new AuthException(401, ErrorCode.auth.E_GOOGLE_AUTH_FAIL, 'Fail to get Google payload', null)
    } else if (!payload.email) {
      throw new AuthException(
        401,
        ErrorCode.auth.E_GOOGLE_AUTH_FAIL,
        'Google payload does not have attribute: email',
        null
      )
    } else if (!payload.sub) {
      throw new AuthException(
        401,
        ErrorCode.auth.E_GOOGLE_AUTH_FAIL,
        'Google payload does not have attribute: sub',
        null
      )
    } else {
      return payload
    }
  }
}
