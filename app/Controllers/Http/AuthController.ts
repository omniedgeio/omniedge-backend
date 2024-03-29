import { JWTCustomPayload } from '@ioc:Adonis/Addons/Jwt'
import Mail from '@ioc:Adonis/Addons/Mail'
import Env from '@ioc:Adonis/Core/Env'
import Hash from '@ioc:Adonis/Core/Hash'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Logger from '@ioc:Adonis/Core/Logger'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import Database, { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import AuthException from 'App/Exceptions/AuthException'
import Identity from 'App/Models/Identity'
import Plan from 'App/Models/Plan'
import Referral from 'App/Models/Referral'
import ReferralRegisterUser from 'App/Models/ReferralRegisterUser'
import SecurityKey from 'App/Models/SecurityKey'
import Server from 'App/Models/Server'
import User from 'App/Models/User'
import VirtualNetwork from 'App/Models/VirtualNetwork'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import AWS from 'aws-sdk'
import axios from 'axios'
import { AuthType, ServerType, UserRole, UserStatus } from 'Contracts/enum'
import Omniedge, { default as omniedge, default as omniedgeConfig } from 'Contracts/omniedge'
import { OAuth2Client, TokenPayload } from 'google-auth-library'
import { DateTime } from 'luxon'
import { ErrorCode } from '../../../utils/constant'
import { generateToken, verifyToken } from '../../../utils/jwt'
import { ip2Country } from 'App/Util/geo'

// todo all login check user status!=blocked
export default class AuthController {
  private activateEndpoint = (token) => omniedge.clientUrl + '/email_verification?token=' + token
  private resetPasswordEndpoint = (token) => omniedge.clientUrl + '/forgot-password/verify?code=' + token

  /**
   * happy path: user register -> [inactive user] -> send email -> user click the email -> [active user]
   * 1. if user register with the same email, it will be rejected with the following rules
   *  a. if user's status is inactive, redirect the page in which user can resend verify email [not implementation]
   *  b. if user's status is active, tell user that the email is already used, and redirect to login page [not implementation]
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
            removeDots: false,
            removeSubaddress: false,
          },
        }),
        rules.unique({
          table: 'users',
          column: 'email',
        }),
      ]),
      name: schema.string({ trim: true }),
      password: schema.string({ trim: true }, Omniedge.rules.passwordRules),
    })
    const payload = await request.validate({
      schema: authSchema,
      reporter: CustomReporter,
      messages: {
        'password.regex':
          'Password must be at least 8 characters, contain at least one uppercase letter, one lowercase letter, one number and one special character',
      },
    })

    const existsUser = await User.findBy('email', payload.email)
    if (existsUser) {
      response.formatError(400, ErrorCode.auth.E_USER_EXISTS, 'User already exists')
      return
    }

    const freePlan = await Plan.findBy('slug', 'free')
    const user = new User()
    user.email = payload.email
    user.name = payload.name
    user.password = payload.password
    user.status = UserStatus.Inactive
    user.planId = freePlan ? freePlan.id : null
    const resUser = await User.create(user)
    await this.createDefaultVirtualNetwork(resUser, request.ip())
    response.status(200)
    if (resUser.$isPersisted) {
      response.format(200, resUser)
    } else {
      response.formatError(502, ErrorCode.auth.E_SAVE_USER, 'Fail to save user')
    }
    const referralCode = request.cookie('referral_code', '')
    Logger.info(`referralCode: ${referralCode}`)
    await this.afterUserRegistered(user, referralCode);
    const emailToken = await this.generateActivateToken(user.email)
    await Mail.use().sendLater((message) => {
      message
        .from(omniedgeConfig.mail.senderAddress)
        .to(payload.email)
        .subject('Welcome to Omniedge')
        .htmlView('emails/welcome', {
          name: user.name,
          uri: this.activateEndpoint(emailToken),
        })
    }).catch((e: Error) => {
      Logger.error(e.message);
    })
    this.sendContactToMautic(user)
  }

  public async resendVerifyEmail({ request, response }: HttpContextContract) {
    const requestSchema = schema.create({
      email: schema.string({ trim: true }, [
        rules.email({
          sanitize: {
            lowerCase: true,
            removeDots: false,
            removeSubaddress: false,
          },
        }),
      ]),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    const user = await User.findBy('email', payload.email)
    if (!user) {
      response.formatError(404, ErrorCode.auth.E_USER_NOT_FOUND, 'User not found')
      return
    }
    if (UserStatus.Active == user.status) {
      response.formatError(400, ErrorCode.auth.E_USER_ACTIVATED, 'User is already activated')
      return
    }
    if (UserStatus.Blocked == user.status) {
      response.formatError(403, ErrorCode.auth.E_USER_BLOCKED, 'User is blocked')
      return
    }
    const emailToken = await this.generateActivateToken(user.email!!)
    try {
      await Mail.use().send((message) => {
        message
          .from(omniedgeConfig.mail.senderAddress, omniedgeConfig.mail.senderName)
          .to(payload.email)
          .subject('Welcome to Omniedge')
          .htmlView('emails/welcome', {
            name: user.name,
            uri: this.activateEndpoint(emailToken),
          })
      })
      response.format(200, '')
    } catch (e) {
      Logger.fatal('fail to send email, err: %o', e)
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
      jwtPayload = await this.verifyActivateToken(requestPayload.token)
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
    const user = await User.findBy('email', jwtPayload.data!!.email)
    if (!user) {
      response.formatError(404, ErrorCode.auth.E_USER_NOT_FOUND, 'User not found')
      return
    }
    switch (user.status) {
      case UserStatus.Active:
        response.format(200, 'User is already activated')
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
      email: schema.string({ trim: true }, [
        rules.email({
          sanitize: {
            lowerCase: true,
            removeDots: false,
            removeSubaddress: false,
          },
        }),
      ]),
      password: schema.string({ trim: true }),
    })
    const payload = await request.validate({ schema: authSchema, reporter: CustomReporter })

    // Cognito
    const user = await User.query().where('email', payload.email).first()

    if (user?.cognitoId && !user.password) {
      const cognitoISP = new AWS.CognitoIdentityServiceProvider()
      try {
        const cognitoAuth = await cognitoISP
          .adminInitiateAuth({
            AuthFlow: 'ADMIN_NO_SRP_AUTH',
            ClientId: Env.get('COGNITO_APP_CLIENT_ID'),
            UserPoolId: Env.get('COGNITO_USER_POOL_ID'),
            AuthParameters: {
              USERNAME: user.cognitoId,
              PASSWORD: payload.password,
            },
          })
          .promise()

        if (cognitoAuth.AuthenticationResult) {
          user.password = payload.password
          await user.save()
        } else {
          return response.formatError(401, ErrorCode.auth.E_EMAIL_PASSWORD_NOT_MATCH, 'Invalid credentials')
        }
      } catch (err) {
        Logger.error(err.message)
        return response.formatError(401, ErrorCode.auth.E_EMAIL_PASSWORD_NOT_MATCH, 'Invalid credentials')
      }
    }

    if (!user?.password) {
      return response.formatError(401, ErrorCode.auth.E_EMAIL_PASSWORD_NOT_MATCH, 'Invalid credentials')
    }

    if (!user) {
      return response.formatError(404, ErrorCode.auth.E_USER_NOT_FOUND, 'User not found')
    }
    user.lastLoginAt = DateTime.now()
    await user.save()

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
    const keyLstr = payload.key.substring(0, 16)
    const sks = await SecurityKey.query().where('keyLstr', keyLstr)
    for (let sk of sks) {
      if (await Hash.verify(sk.key, payload.key)) {
        const user = await User.find(sk.userId)

        if (!user) {
          return response.formatError(404, ErrorCode.auth.E_USER_NOT_FOUND, 'User not found')
        }
        user.lastLoginAt = DateTime.now()
        await user.save()

        const token = await auth.use('jwt').generate(user!!, {
          expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
        })
        response.format(200, token)
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
      user.lastLoginAt = DateTime.now()
      await user.save()

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

      const freePlan = await Plan.findBy('slug', 'free')
      newGoogleUser.planId = freePlan ? freePlan.id : null

      Logger.info('New google user %o, original payload is %o', newGoogleUser, googlePayload)

      const identity = new Identity()
      identity.provider = AuthType.Google
      identity.providerUserId = googlePayload.sub
      identity.metadata = JSON.stringify(googlePayload)
      Logger.info('New google user[identity] %o', newGoogleUser)

      await Database.transaction(async (tx) => {
        newGoogleUser.useTransaction(tx)
        const dbGoogleUser = await newGoogleUser.save()
        await this.createDefaultVirtualNetwork(dbGoogleUser, request.ip(), tx)
        newGoogleUser.id = dbGoogleUser.id
        newGoogleUser.lastLoginAt = DateTime.now()
        await newGoogleUser.save()
        identity.userId = dbGoogleUser.id
        identity.useTransaction(tx)
        await identity.save()
      })

      const token = await auth.use('jwt').generate(newGoogleUser, {
        expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
      })

      const referralCode = request.cookie('referralCode', '')
      await this.afterUserRegistered(newGoogleUser, referralCode)
      response.format(200, token)
    } else {
      response.formatError(
        403,
        ErrorCode.auth.E_GOOGLE_AUTH_FAIL,
        'The email which your google account binds is used in the system',
      )
    }
  }

  public async refresh({ request, response, auth }: HttpContextContract) {
    const requestSchema = schema.create({
      refresh_token: schema.string({ trim: true }),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    try {
      const token = await auth.use('jwt').loginViaRefreshToken(payload.refresh_token, {
        expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
      })
      response.format(200, token)
    } catch (e) {
      response.format(401, 'refresh token is incorrect')
    }


  }

  public async forgetPassword({ request, response }: HttpContextContract) {
    const requestSchema = schema.create({
      email: schema.string({ trim: true }, [
        rules.email({
          sanitize: {
            lowerCase: true,
            removeDots: false,
            removeSubaddress: false,
          },
        }),
      ]),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    const email = payload.email
    const user = await User.findBy('email', email)
    if (!user) {
      response.formatError(404, ErrorCode.auth.E_USER_NOT_FOUND, 'User not found')
      return
    }
    const forgetPasswordToken = await this.generateForgetPasswordToken(email)
    try {
      await Mail.use().send((message) => {
        message
          .from(omniedgeConfig.mail.senderAddress, omniedgeConfig.mail.senderName)
          .to(payload.email)
          .subject('Forget Password')
          .htmlView('emails/forget', {
            name: user.name,
            uri: this.resetPasswordEndpoint(forgetPasswordToken),
          })
      })
      response.format(200, '')
    } catch (e) {
      Logger.fatal('Fail to send forget password email')
      response.formatError(500, ErrorCode.auth.F_EMAIL_SEND, 'Fail to send forget password email')
    }
  }

  public async resetPasswordWithVerification({ request, response }: HttpContextContract) {
    const authSchema = schema.create({
      token: schema.string({ trim: true }),
      password: schema.string({ trim: true }, Omniedge.rules.passwordRules),
    })
    const requestPayload = await request.validate({ schema: authSchema, reporter: CustomReporter })

    let jwtPayload: JWTCustomPayload | undefined
    try {
      jwtPayload = await this.verifyForgetPasswordToken(requestPayload.token)
    } catch (e) {
      Logger.error('Invalid token: jwt token is %o', jwtPayload)
      response.formatError(400, ErrorCode.auth.E_TOKEN_INVALID, e.message)
      return
    }
    if (!jwtPayload) {
      response.formatError(401, ErrorCode.auth.E_TOKEN_INVALID, 'The forget password token may be invalid')
      return
    }
    if (!jwtPayload!!.data!!.email) {
      Logger.error('Invalid JWT payload: missing email, payload is %o', jwtPayload)
      response.formatError(400, ErrorCode.auth.E_TOKEN_INVALID, 'Invalid JWT payload: missing email')
      return
    }
    const email = jwtPayload!!.data!!.email

    const user = await User.findBy('email', email)
    if (!user) {
      response.formatError(404, ErrorCode.auth.E_USER_NOT_FOUND, 'User not found')
      return
    }
    user.password = requestPayload.password
    const resUser = await user.save()
    response.format(200, resUser)
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
        null,
      )
    } else if (!payload.sub) {
      throw new AuthException(
        401,
        ErrorCode.auth.E_GOOGLE_AUTH_FAIL,
        'Google payload does not have attribute: sub',
        null,
      )
    } else {
      return payload
    }
  }

  private async generateForgetPasswordToken(email: string): Promise<string> {
    return generateToken(omniedge.key.forgetPasswordExpiresIn, { email: email }, omniedgeConfig.key.forgetPasswordKey)
  }

  private async verifyForgetPasswordToken(token: string): Promise<JWTCustomPayload> {
    return verifyToken(token, omniedgeConfig.key.forgetPasswordKey)
  }

  private async generateActivateToken(email: string): Promise<string> {
    return generateToken(omniedge.key.activateAccountExpiresIn, { email: email }, omniedgeConfig.key.activateAccountKey)
  }

  private async verifyActivateToken(token: string): Promise<JWTCustomPayload> {
    return verifyToken(token, omniedgeConfig.key.activateAccountKey)
  }

  private async createDefaultVirtualNetwork(user: User, ip: string, tx?: TransactionClientContract): Promise<void> {
    const virtualNetwork = new VirtualNetwork()
    if (tx) virtualNetwork.useTransaction(tx)
    virtualNetwork.fill({
      name: 'My Omni Network',
      ipRange: '100.100.0.0/24',
    })
    Logger.debug('request ip is %s', ip)
    let server: Server | null
    let query = Server.query().where('type', ServerType.Default)
    ip2Country(ip)
    const countryCode = ip2Country(ip)
    server = await query.where('country', countryCode).first()
    if (server) {
      virtualNetwork.serverId = server.id
    }

    await virtualNetwork.save()
    await user.related('virtualNetworks').attach({
      [virtualNetwork.id]: {
        role: UserRole.Admin,
      },
    })
  }

  private async sendContactToMautic(user: User): Promise<void> {
    if (Env.get('NODE_ENV') !== 'production') return
    await axios({
      method: 'POST',
      url: Env.get('MAUTIC_URL') + '/api/contacts/new',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(Env.get('MAUTIC_USERNAME') + ':' + Env.get('MAUTIC_PASSWORD')).toString('base64'),
      },
      data: {
        firstname: user.name,
        email: user.email,
        tag: 'omniedge-backend',
      },
    })
  }

  private async afterUserRegistered(user: User, referralCode: string): Promise<void> {
    if (referralCode) {
      const referral = await Referral.findBy('referral_code', referralCode)
      if (referral) {
        await ReferralRegisterUser.create({
          registerUserId: user.id,
          referralCodeUserId: referral.userId,
        })
      }
    }
  }
}
