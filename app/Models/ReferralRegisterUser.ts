import { DateTime } from 'luxon'
import { afterCreate, BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import BonusLimit from './BonusLimit'

export default class ReferralRegisterUser extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column({ columnName: 'register_user_id '})
  public registerUserId: string

  @column({columnName: 'referral_code_user_id'})
  public referralCodeUserId: string

  @afterCreate()
  public static async generate(model: ReferralRegisterUser) {
    const bonusLimit = await BonusLimit.query().where('user_id', model.referralCodeUserId).first()
    if (!bonusLimit) {
      await BonusLimit.create({
        userId: model.referralCodeUserId,
        deviceLimit: 1,
        networkLimit: 0,
      })
    } else {
      const count = await ReferralRegisterUser.query().where('referral_code_user_id', model.referralCodeUserId);
      if (count.length === 10) {
        bonusLimit.deviceLimit = 10;
        bonusLimit.networkLimit = 1;
        await bonusLimit.save()
      } else if (count.length === 20) {
        bonusLimit.deviceLimit = 20;
        bonusLimit.networkLimit = 2;
        await bonusLimit.save()
      } else if (count.length === 100) {
        bonusLimit.deviceLimit = 100;
        bonusLimit.networkLimit = 10;
        await bonusLimit.save()
      }
    }
  }
}
