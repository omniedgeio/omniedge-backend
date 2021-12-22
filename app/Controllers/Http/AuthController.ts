import {HttpContextContract} from '@ioc:Adonis/Core/HttpContext'
import {rules, schema} from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'
import {CustomReporter} from "App/Validators/Reporters/CustomReporter";
import {OAuth2Client, TokenPayload} from "google-auth-library";
import {AuthType, UserStatus} from "Contracts/enum";
import Identity from "App/Models/Identity";
import Database from "@ioc:Adonis/Lucid/Database";
import Logger from "@ioc:Adonis/Core/Logger";

export default class AuthController {
  public async register({request, response}: HttpContextContract) {
    const authSchema = schema.create({
      email: schema.string({trim: true,}, [
        rules.email({
          sanitize: {
            lowerCase: true
          }
        }),
        rules.unique({
          table: 'users',
          column: 'email',
        }),
      ]),
      name: schema.string({trim: true}),
      password: schema.string({trim: true}),
    })
    const payload = await request.validate({schema: authSchema, reporter: CustomReporter})
    const user = await User.create(payload)
    if (user.$isPersisted) {
      response.status(201).send(user)
    } else {
      response.status(502)
    }
  }

  public async loginWithPassword({request, response, auth}: HttpContextContract) {
    const authSchema = schema.create({
      email: schema.string({trim: true}, [rules.email({
        sanitize: {
          lowerCase: true
        }
      })]),
      password: schema.string({trim: true}),
    })
    const payload = await request.validate({schema: authSchema, reporter: CustomReporter})
    const token = await auth.attempt(payload.email, payload.password, {
      expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
    })
    response.status(200).send(token)
  }

  public async loginWithSecurityKey({request, response, auth}: HttpContextContract) {
    const authSchema = schema.create({
      key: schema.string({trim: true}),
    })
    const payload = await request.validate({schema: authSchema, reporter: CustomReporter})
    const token = await auth.use('jwt').attemptSecretKey(payload.key, {
      expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
    })
    response.status(200).send(token)
  }

  public async loginWithGoogle({request, response, auth}: HttpContextContract) {
    const authSchema = schema.create({
      id_token: schema.string({trim: true}),
    })
    const requestPayload = await request.validate({schema: authSchema, reporter: CustomReporter})
    const googlePayload = await this.verify(requestPayload.id_token)
    const user = await User.findBy('email', googlePayload?.email)
    if (!user) {
      const newGoogleUser = new User();
      newGoogleUser.name = googlePayload?.name ?? ''
      newGoogleUser.email = googlePayload?.email!!
      newGoogleUser.password = ''
      newGoogleUser.picture = googlePayload?.picture ?? ''
      newGoogleUser.status = UserStatus.Active
      Logger.info("New google user %o, original payload is %o", newGoogleUser, googlePayload)

      const identity = new Identity()
      identity.provider = AuthType.Google
      identity.providerUserId = googlePayload.sub
      identity.metadata = JSON.stringify(googlePayload)
      Logger.info("New google user[identity] %o", newGoogleUser)

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
      response.status(200).send(token)
    } else {
      const token = await auth.use('jwt').generate(user, {
        expiresIn: process.env.LOGIN_TOKEN_EXPIRE,
      })
      response.status(200).send(token)
    }


  }


  private async verify(idToken: string): Promise<TokenPayload> {
    const googleClientId = process.env.GOOGLE_CLIENT_ID
    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: googleClientId
    })
    const payload = ticket.getPayload()
    // todo check payload and payload email
    if (payload == undefined) {
      throw new Error('Invalid token')
    } else {
      return payload
    }
  }
}
