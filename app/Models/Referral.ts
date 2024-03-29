import { DateTime } from 'luxon'
import referralCodeGenerator from 'referral-code-generator'
import { BaseModel, column, belongsTo, BelongsTo, beforeCreate } from '@ioc:Adonis/Lucid/Orm'
import User from "./User";

export default class Referral extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column({ columnName: 'referral_code' })
  public referralCode: string

  @column({ columnName: 'user_id' })
  public userId: string

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>;

  @beforeCreate()
  public static async generate(model: Referral) {
    model.referralCode = referralCodeGenerator.custom('lowercase', 6, 6, 'omniedge');
  }
}
