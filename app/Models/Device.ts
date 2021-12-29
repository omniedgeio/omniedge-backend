import { Filterable } from '@ioc:Adonis/Addons/LucidFilter'
import { compose } from '@ioc:Adonis/Core/Helpers'
import { BaseModel, beforeCreate, belongsTo, BelongsTo, column, ManyToMany, manyToMany } from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'
import { modelId } from './../../utils/nanoid'
import DeviceFilter from './Filters/DeviceFilter'
import User from './User'
import VirtualNetwork from './VirtualNetwork'

export default class Device extends compose(BaseModel, Filterable) {
  public static $filter = () => DeviceFilter

  @column({ isPrimary: true })
  public id: string

  @column({ serializeAs: null })
  public userId: string

  @column()
  public hardwareId: string

  @column()
  public platform: string

  @column()
  public name: string

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>

  @manyToMany(() => VirtualNetwork, {
    pivotTable: 'virtual_network_device',
    pivotColumns: ['virtual_ip', 'last_seen'],
  })
  public virtualNetworks: ManyToMany<typeof VirtualNetwork>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @beforeCreate()
  public static async createID(model: Device) {
    model.id = 'dev_' + modelId()
  }

  public serializeExtras() {
    return {
      virtual_ip: this.$extras?.pivot_virtual_ip,
      last_seen: this.$extras?.pivot_last_seen,
    }
  }
}
