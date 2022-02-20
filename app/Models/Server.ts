import { BaseModel, beforeCreate, BelongsTo, belongsTo, column, HasMany, hasMany } from '@ioc:Adonis/Lucid/Orm'
import { Country } from 'Contracts/enum'
import { DateTime } from 'luxon'
import { modelId } from './../../utils/nanoid'
import User from './User'
import VirtualNetwork from './VirtualNetwork'

export default class Server extends BaseModel {
  @column({ isPrimary: true })
  public id: string

  @column()
  public name: string

  @column()
  public host: string

  @column()
  public country: Country | null

  @column({ serializeAs: null })
  public userId: string | null

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>

  @hasMany(() => VirtualNetwork)
  public virtualNetworks: HasMany<typeof VirtualNetwork>

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @beforeCreate()
  public static async createID(model: Server) {
    model.id = 'svr_' + modelId()
  }
}
