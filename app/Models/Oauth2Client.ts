import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import crypto from 'crypto'

export default class Oauth2Client extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'client_id' })
  public clientId: string

  @column({ columnName: 'client_secret', serializeAs: null })
  public clientSecret: string

  @column.dateTime({ autoCreate: true, serialize: (value) => value.toFormat('dd LLL yyyy') })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serialize: (value) => value.toFormat('dd LLL yyyy') })
  public updatedAt: DateTime

  static generateClientIdOrSecret() :string {
    return crypto.randomBytes(40).toString('hex')
  }
}
