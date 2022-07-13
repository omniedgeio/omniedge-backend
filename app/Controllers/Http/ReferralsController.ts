import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Referral from 'App/Models/Referral';

export default class ReferralsController {
  public async createReferralsCode({auth, response} :HttpContextContract) {
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

  public async setReferralCookie({request, response} :HttpContextContract) {
    const referralCode = request.qs().referral_code;
    const referral = await Referral.findBy('referral_code', referralCode)
    if (!referral) {
      response.status(204);
      return
    }
    response.cookie('referral_code', referralCode, {sameSite: 'none'})
    response.status(204);
    return
  }

  public async deleteReferralsCode({request, response} :HttpContextContract) {
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
}
