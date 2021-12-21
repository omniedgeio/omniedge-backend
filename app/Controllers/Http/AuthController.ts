import {HttpContextContract} from '@ioc:Adonis/Core/HttpContext'
import {rules, schema} from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'
import {CustomReporter} from "App/Validators/Reporters/CustomReporter";

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
    const payload = await request.validate({schema: authSchema, reporter: CustomReporter})

    response.status(200).send(token)
  }


}
