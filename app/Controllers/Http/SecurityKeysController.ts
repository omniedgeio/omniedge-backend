import Env from '@ioc:Adonis/Core/Env'
import Hash from '@ioc:Adonis/Core/Hash'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import SecurityKey from 'App/Models/SecurityKey'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import { SecurityKeyType } from 'Contracts/enum'
import { DateTime } from 'luxon'
import { nanoid } from '../../../utils/nanoid'

export default class SecurityKeysController {
  public async create({ request, response, auth }: HttpContextContract) {
    const payload = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [rules.maxLength(60)]),
        type: schema.enum(Object.values(SecurityKeyType)),
      }),
      reporter: CustomReporter,
    })

    const user = auth.user!
    const key = nanoid(32)
    const securityKey = new SecurityKey()
    securityKey.fill({
      name: payload.name,
      type: payload.type as SecurityKeyType,
      key: await Hash.make(key),
    })

    switch (payload.type) {
      case SecurityKeyType.Permanent:
        securityKey.expiresAt = DateTime.now().plus({ millisecond: Env.get('NORMAL_SECURITY_KEY_EXPIRE') })
      case SecurityKeyType.Temporary:
        securityKey.expiresAt = DateTime.now().plus({ millisecond: Env.get('ONE_TIME_SECURITY_KEY_EXPIRE') })
    }

    await user.related('securityKeys').create(securityKey)

    return response.format(200, {
      id: securityKey.id,
      name: securityKey.name,
      key,
      type: securityKey.type,
      expires_at: securityKey.expiresAt,
      created_at: securityKey.createdAt,
    })
  }

  public async list({ request, response, auth }: HttpContextContract) {
    const user = auth.user!
    const securityKeys = await user
      .related('securityKeys')
      .query()
      .select('id', 'name', 'type', 'expires_at', 'created_at')
      .paginate(
        Math.round(Math.max(request.input('page') || 1, 1)),
        Math.round(Math.max(request.input('per_page') || 10, 10))
      )

    return response.format(200, securityKeys.serialize())
  }

  public async retrieve({ params, response, auth }: HttpContextContract) {
    const securityKey = await auth.user
      ?.related('securityKeys')
      .query()
      .select('id', 'name', 'type', 'expires_at', 'created_at')
      .where('id', params.id)
      .first()

    if (!securityKey) {
      return response.format(404, 'Security key not found')
    }

    return response.format(200, securityKey)
  }

  public async update({ request, params, response, auth }: HttpContextContract) {
    const payload = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [rules.maxLength(60)]),
      }),
      reporter: CustomReporter,
    })

    const securityKey = await auth.user
      ?.related('securityKeys')
      .query()
      .select('id', 'name', 'type', 'expires_at', 'created_at')
      .where('id', params.id)
      .first()

    if (!securityKey) {
      return response.format(404, 'Security key not found')
    }

    if (payload.name) {
      securityKey.name = payload.name
    }
    await securityKey.save()

    return response.format(200, securityKey)
  }

  public async delete({ params, response, auth }: HttpContextContract) {
    const securityKey = await auth.user?.related('securityKeys').query().where('id', params.id).first()

    if (!securityKey) {
      return response.format(404, 'Security key not found')
    }

    await securityKey.delete()

    return response.format(200, 'Security key deleted')
  }
}
