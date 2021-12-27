import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import { OAuth2Client, TokenPayload } from 'google-auth-library'
import { AuthType, UserStatus } from 'Contracts/enum'
import Identity from 'App/Models/Identity'
import Database from '@ioc:Adonis/Lucid/Database'
import Logger from '@ioc:Adonis/Core/Logger'
import { generateToken, verifyToken } from '../../../utils/jwt'
import Mail from '@ioc:Adonis/Addons/Mail'
import omniedgeConfig from 'Contracts/omniedge'
import { JWTCustomPayload } from '@ioc:Adonis/Addons/Jwt'
import { ErrorCode } from '../../../utils/constant'
import AuthException from 'App/Exceptions/AuthException'

// todo all login check user status!=blocked
export default class AuthController {
  private static activateEndpoint = '/auth/register/activate?token='

  /**
   * happy path: user register -> [inactive user] -> send email -> user click the email -> [active user]
   * 1. if user register with the same email, it will be rejected with the following rules
   *  a. if user's status is inactive, redirect the page in which user can resend verify email
   *  b. if user's status is active, tell user that the email is already used, and redirect to login page
   * 2. if fail to send the email, or user does not click the verify email
   *    user still log in to one special page to activate the account by the way resending verify email
   * @param request
   * @param response
   */
  public async register({ request, response }: HttpContextContract) {
    const authSchema = schema.create({
      email: schema.string({ trim: true }, [
        rules.email({
          sanitize: {
            lowerCase: true,
          },
        }),
        rules.unique({
          table: 'users',
          column: 'email',
        }),
      ]),
      name: schema.string({ trim: true }),
      password: schema.string({ trim: true }),
    })
    const payload = await request.validate({ schema: authSchema, reporter: CustomReporter })
    const user = new User()
    user.email = payload.email
    user.name = payload.name
    user.password = payload.password
    user.status = UserStatus.Inactive
    const resUser = await User.create(user)
    response.status(200)
    if (resUser.$isPersisted) {
      response.format(200, resUser)
    } else {
      response.formatError(502, ErrorCode.auth.E_SAVE_USER, 'Fail to save user')
    }
    const emailToken = await this.generateEmailToken(user.email)
    await Mail.use().sendLater((message) => {
        message.from(omniedgeConfig.mail.senderAddress)
          // todo change email address
          .to(payload.email)
          .subject('Welcome to Omniedge')
          .htmlView('emails/register', {
            name: user.name,
            uri: omniedgeConfig.mail.baseUrl + AuthController.activateEndpoint + emailToken,
          })
      },
    )
  }

  public async resendVerifyEmail({ request, response }: HttpContextContract) {
    const requestSchema = schema.create({
      email: schema.string({ trim: true }, [
        rules.email({
          sanitize: {
            lowerCase: true,
          },
        }),
      ]),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    const user = await User.findByOrFail('email', payload.email)
    const emailToken = await this.generateEmailToken(user.email!!)
    try {
      await Mail.use().send((message) => {
          message.from(omniedgeConfig.mail.senderAddress, omniedgeConfig.mail.senderName)
            .to(payload.email)
            .subject('Welcome to Omniedge')
            .htmlView('emails/register', {
              name: user.name,
              uri: omniedgeConfig.mail.baseUrl + AuthController.activateEndpoint + emailToken,
            })
        },
      )
      response.format(200, '')
    } catch (e) {
      Logger.fatal('fail to send email')
      response.formatError(500, ErrorCode.auth.F_EMAIL_SEND, 'Fail to send verify email')
    }

  }

  /**
   * happy path: check user status=2 -> update user status=2
   * 1. if jwt payload is expired or invalid, return 400
   * 2. if fail to find the user, return 400
   * 3. if user blocked, return 403
   * 4. if user is active, return 400
   * 5. if user is inactive, return 200
   * @param request
   * @param response
   */
  public async activateAccount({ request, response }: HttpContextContract) {
    const requestSchema = schema.create({
      token: schema.string({ trim: true }),
    })
    const requestPayload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    let jwtPayload: JWTCustomPayload | undefined

    try {
      jwtPayload = await this.verifyEmailToken(requestPayload.token)
    } catch (e) {
      Logger.error('Invalid token: jwt token is %o', jwtPayload)
      response.formatError(400, ErrorCode.auth.E_TOKEN_INVALID, e.message)
      return
    }
    if (!jwtPayload!!.data!!.email) {
      Logger.error('Invalid JWT payload: missing email, payload is %o', jwtPayload)
      response.formatError(400, ErrorCode.auth.E_TOKEN_INVALID, 'Invalid JWT payload: missing email')
      return
    }
    const user = await User.findByOrFail('email', jwtPayload.data!!.email)
    switch (user.status) {
      case UserStatus.Active:
        response.formatError(400, ErrorCode.auth.E_USER_EXISTED, 'User is already active')
        return
      case UserStatus.Blocked:
        response.formatError(403, ErrorCode.auth.E_USER_BLOCKED, 'User is blocked')
        return
      default:
    }
    user.status = UserStatus.Active
    const resUser = user.save()
    response.format(200, resUser)
  }

  public async loginWithPassword({ request, response, auth }: HttpContextContract) {
    const authSchema = schema.create({
      email: schema.string({ trim: true }, [rules.email({
        sanitize: {
          lowerCase: true,
        },
      })]),
      password: schema.string({ trim: true }),
    })
    const payload = await request.validate({ schema: authSchema, reporter: CustomReporter })
    const token = await auth.attempt(payload.email, payload.password, {
      expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
    })
    response.format(200, token)
  }

  public async loginWithSecurityKey({ request, response, auth }: HttpContextContract) {
    const authSchema = schema.create({
      key: schema.string({ trim: true }),
    })
    const payload = await request.validate({ schema: authSchema, reporter: CustomReporter })
    try {
      const token = await auth.use('jwt').attemptSecretKey(payload.key, {
        expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
      })
      response.format(200, token)
    } catch (e) {
      response.formatError(401, e.code, e.message)
    }

  }

  /**
   * if google payload's email exists in database
   * @param request
   * @param response
   * @param auth
   */
  public async loginWithGoogle({ request, response, auth }: HttpContextContract) {
    const authSchema = schema.create({
      id_token: schema.string({ trim: true }),
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
    } else {
      response.formatError(403, ErrorCode.auth.E_GOOGLE_AUTH_FAIL, 'The email which your google account binds is used in the system')
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
      throw new AuthException(401, ErrorCode.auth.E_GOOGLE_AUTH_FAIL, 'Google payload does not have attribute: email', null)
    } else if (!payload.sub) {
      throw new AuthException(401, ErrorCode.auth.E_GOOGLE_AUTH_FAIL, 'Google payload does not have attribute: sub', null)
    } else {
      return payload
    }
  }

  private async generateEmailToken(email: string): Promise<string> {
    return generateToken('1h', { email: email }, omniedgeConfig.key.AUTH_EMAIL_PRIVATE_KEY)
  }

  private async verifyEmailToken(token: string): Promise<JWTCustomPayload> {
    return verifyToken(token, omniedgeConfig.key.AUTH_EMAIL_PRIVATE_KEY)
  }
}
