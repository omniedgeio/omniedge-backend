import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import crypto from 'crypto'
import ms from 'ms'

export default class Oauth2AuthorizationCode extends BaseModel {
  static authorizationCodeLifeTime: string = '10m'

  @column({ isPrimary: true })
  public id: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column({ columnName: 'expires_in' })
  public expiresIn: number

  @column({ columnName: 'client_id'})
  public clientId: string

  @column({ columnName: 'user_id'})
  public userId: string

  @column({ columnName: 'authorization_code'})
  public authorizationCode: string

  static generateAuthorizationCode() :string {
    return crypto.randomBytes(40).toString('hex')
  }

  static generateExpireAt() :number {
    var expires = new Date()
    expires.setSeconds(expires.getSeconds() + ms(this.authorizationCodeLifeTime))
    return Math.floor(expires.getTime() / 1000)
  }

  public authorizationCodeIsExpired() :boolean {
    return this.expiresIn * 1000 < Date.now()
  }
}
