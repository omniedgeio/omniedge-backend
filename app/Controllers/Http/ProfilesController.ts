import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import Referral from 'App/Models/Referral'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import { UsageKey } from 'Contracts/enum'
import Omniedge from 'Contracts/omniedge'
import { DateTime } from 'luxon'
import { ErrorCode } from '../../../utils/constant'

export default class ProfilesController {
  public async index({ response, auth }: HttpContextContract) {
    const user = auth.user!
    await user.load('plan')
    await user.load('identities')

    const subscription = await user.getStripeSubcription()

    const usageLimits = {
      devices: {
        limit: await user.getLimit(UsageKey.Devices),
        usage: await user.getUsage(UsageKey.Devices),
      },
      virtual_networks: {
        limit: await user.getLimit(UsageKey.VirtualNetworks),
        usage: await user.getUsage(UsageKey.VirtualNetworks),
      },
    }

    const referral = await Referral.findBy('user_id', user.id)

    response.format(200, {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      identities: user.identities,
      subscription: {
        title: user.plan.title,
        slug: user.plan.slug,
        start_at: subscription?.current_period_start && DateTime.fromSeconds(subscription?.current_period_start),
        end_at: subscription?.current_period_end && DateTime.fromSeconds(subscription?.current_period_end),
        cancel_at: subscription?.cancel_at && DateTime.fromSeconds(subscription?.cancel_at),
      },
      usage_limits: usageLimits,
      referral_code: referral ? referral.referralCode : '',
    })
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
