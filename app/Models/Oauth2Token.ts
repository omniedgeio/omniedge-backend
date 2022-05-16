import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import crypto from 'crypto'
import ms from 'ms'

export default class Oauth2Token extends BaseModel {
  static refreshTokenLifetime: string = '14d'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'access_token' })
  public accessToken: string

  @column({ columnName: 'refresh_token' })
  public refreshToken: string

  @column({ columnName: 'expires_in' })
  public expiresIn: number

  @column({ columnName: 'client_id'})
  public clientId: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  static generateToken() :string {
    return crypto.randomBytes(40).toString('hex')
  }

  static generateExpireAt() :number {
    var expires = new Date()
    expires.setSeconds(expires.getSeconds() + ms(this.refreshTokenLifetime))
    return Math.floor(expires.getTime() / 1000)
  }

  public accssTokenIsExpired() :boolean {
    return this.expiresIn * 1000 < Date.now()
  }
}
