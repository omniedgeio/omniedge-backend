import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import User from 'App/Models/User'
import VirtualNetwork from 'App/Models/VirtualNetwork'
import { DateTime } from 'luxon'
import { UserRole } from './../../contracts/enum'

export default class UserVirtualNetwork extends BaseModel {
  public static table = 'user_virtual_network'

  @column({ isPrimary: true })
  public id: number

  @column()
  public userId: string

  @column()
  public virtualNetworkId: string

  @column()
  public role: UserRole

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>

  @belongsTo(() => VirtualNetwork)
  public virtualNetwork: BelongsTo<typeof VirtualNetwork>
}
