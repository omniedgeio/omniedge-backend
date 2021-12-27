import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Logger from '@ioc:Adonis/Core/Logger'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import Omniedge from 'Contracts/omniedge'
import { ErrorCode } from '../../../utils/constant'

export default class ProfilesController {

  public async index({ response, auth }: HttpContextContract) {
    const userId = auth.user!.id
    Logger.info('userId: %s', userId)
    const users = await User.query()
      .where('id', userId)
      .preload('identities', (query) => {
        query.where('user_id', userId)
      })
    response.format(200, users)
  }

  public async update({ request, response, auth }: HttpContextContract) {
    const requestSchema = schema.create({
      name: schema.string({ trim: true }, [rules.minLength(1), rules.maxLength(60)]),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    auth.user!!.name = payload.name
    const resUser = await auth.user?.save()
    response.format(200, resUser)
  }

  public async changePassword({ request, response, auth }: HttpContextContract) {
    const requestSchema = schema.create({
      old_password: schema.string({ trim: true }),
      password: schema.string({ trim: true }, Omniedge.rules.passwordRules),
    })
    const payload = await request.validate({ schema: requestSchema, reporter: CustomReporter })
    if (payload.old_password == payload.password) {
      response.formatError(400, ErrorCode.auth.E_NEW_PASSWORD_SAME, 'New password is same as old password')
      return
    }
    await auth.verifyCredentials(auth.user!!.id, payload.old_password)
    auth.user!!.password = payload.password
    const resUser = await auth.user?.save()
    response.format(200, resUser)
  }
}
