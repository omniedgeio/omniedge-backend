import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BonusLimit from 'App/Models/BonusLimit';
import Referral from 'App/Models/Referral';

export default class ReferralsController {
  public async createReferralsCode({ auth, response }: HttpContextContract) {
    const user = auth.user!
    const oldReferral = await Referral.query().where('user_id', user.id).first()
    if (oldReferral) {
      response.badRequest({ error: 'you have already a referral code' })
      return
    }

    const referral = await user.related('referral').create({
      userId: user.id,
    })
    response.format(200, {
      referral_code: referral.referralCode
    })
  }

  public async setReferralCookie({ request, response }: HttpContextContract) {
    const referralCode = request.qs().referral_code;
    const referral = await Referral.findBy('referral_code', referralCode)
    if (!referral) {
      response.status(204);
      return
    }
    response.cookie('referral_code', referralCode, { sameSite: 'none', secure: true })
    response.status(204);
    return
  }

  public async deleteReferralsCode({ request, response }: HttpContextContract) {
    const code = request.param('code');
    if (code) {
      const referral = await Referral.query().where('referral_code', code).first()
      if (referral) {
        await referral.related('user').dissociate()
        response.format(200, 'remove referral code success')
        return
      }
      response.badRequest({ error: 'there is no such referral code' })
      return
    }
    response.badRequest({ error: 'code is empty' })
    return
  }

  public async getReferralsInfo({ auth, response }: HttpContextContract) {
    const user = auth.user!
    const referral = await Referral.query().where('user_id', user.id).first()
    if (!referral) {
      response.format(200, {
        referral_code: '',
        bonus_device: 0,
        bonus_virtual_network: 0,
      })
      return
    }
    const bonusLimit = await BonusLimit.query().where('user_id', user.id).first()
    const bonusDeviceLimit = bonusLimit?.deviceLimit ?? 0
    const bonusNetworkLimit = bonusLimit?.networkLimit ?? 0

    response.format(200, {
      referral_code: referral.referralCode,
      bonus_device: bonusDeviceLimit,
      bonus_virtual_network: bonusNetworkLimit,
    })
  }
}
