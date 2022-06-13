import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class ReferralsController {
  public async createReferralsCode({auth, response} :HttpContextContract) {
    const user = auth.user!
    const referral = await user.createReferral()
    response.format(200, referral)
  }

  public async deleteReferralsCode({auth, response} :HttpContextContract) {
    const user = auth.user!
    const referral = 
    response.format(200, referral)
  }
}
