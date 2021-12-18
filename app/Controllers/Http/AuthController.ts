import {HttpContextContract} from '@ioc:Adonis/Core/HttpContext'
import {rules, schema} from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'

export default class AuthController {
  public async register({request, response}: HttpContextContract) {
    // todo check email(to lower case)
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
    const payload = await request.validate({schema: authSchema})
    const user = await User.create(payload)
    if (user.$isPersisted) {
      response.status(201).send(user)
    } else {
      response.status(502)
    }
  }

  public async loginWithPassword({request, response, auth}: HttpContextContract) {
    const authSchema = schema.create({
      email: schema.string({trim: true}, [rules.email()]),
      password: schema.string({trim: true}),
    })
    const payload = await request.validate({schema: authSchema})
    const email = payload.email.toLowerCase()
    const token = await auth.attempt(email, payload.password, {
      expiresIn: process.env.LOGIN_TOKEN,
    })
    response.status(200).send(token)
  }

  public async loginWithSecurityKey({request, response, auth}: HttpContextContract) {
    const authSchema = schema.create({
      key: schema.string({trim: true}),
    })
    const payload = await request.validate({schema: authSchema})
    const securityKey = payload.key
    const token = await auth.attempt(email, payload.password, {
      expiresIn: process.env.LOGIN_TOKEN,
    })
    response.status(200).send(token)
  }

  public async profile({auth}: HttpContextContract) {
    const user = await auth.user!!
    return user
  }
}
