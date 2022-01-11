import { Filterable } from '@ioc:Adonis/Addons/LucidFilter'
import Stripe from '@ioc:Adonis/Addons/Stripe'
import Hash from '@ioc:Adonis/Core/Hash'
import { compose } from '@ioc:Adonis/Core/Helpers'
import {
  BaseModel,
  beforeCreate,
  beforeSave,
  BelongsTo,
  belongsTo,
  column,
  HasMany,
  hasMany,
  ManyToMany,
  manyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'
import { UserRole, UserStatus } from './../../contracts/enum'
import { modelId } from './../../utils/nanoid'
import Device from './Device'
import UserFilter from './Filters/UserFilter'
import Identity from './Identity'
import Invitation from './Invitation'
import PasswordReset from './PasswordReset'
import Plan from './Plan'
import SecurityKey from './SecurityKey'
import UserLimit from './UserLimit'
import UserVirtualNetwork from './UserVirtualNetwork'
import VirtualNetwork from './VirtualNetwork'

export default class User extends compose(BaseModel, Filterable) {
  public static $filter = () => UserFilter

  @column({ isPrimary: true })
  public id: string

  @column()
  public name: string

  @column()
  public email: string

  @column({ serializeAs: null })
  public emailVerifiedAt: DateTime | null

  @column({ serializeAs: null })
  public password?: string

  @column()
  public picture: string | null

  @column()
  public lastLoginIp: string | null

  @column()
  public lastLoginAt: DateTime | null

  @column()
  public status: UserStatus

  @column({ serializeAs: null })
  public planId: string | null

  @column({ serializeAs: null })
  public stripeCustomerId: string | null

  @column({ serializeAs: null })
  public stripeSubscriptionId: string | null

  @column.dateTime({ serializeAs: null })
  public ExpiredAt: DateTime

  @hasMany(() => Device)
  public devices: HasMany<typeof Device>

  @hasMany(() => Identity)
  public identities: HasMany<typeof Identity>

  @manyToMany(() => VirtualNetwork, {
    pivotTable: 'user_virtual_network',
    pivotColumns: ['role', 'created_at'],
    pivotTimestamps: true,
  })
  public virtualNetworks: ManyToMany<typeof VirtualNetwork>

  @hasMany(() => SecurityKey)
  public securityKeys: HasMany<typeof SecurityKey>

  @hasMany(() => Invitation)
  public invitations: HasMany<typeof Invitation>

  @hasMany(() => PasswordReset)
  public passwordResets: HasMany<typeof PasswordReset>

  @belongsTo(() => Plan)
  public plan: BelongsTo<typeof Plan>

  @hasMany(() => UserLimit)
  public limits: HasMany<typeof UserLimit>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password as string)
    }
  }

  @beforeCreate()
  public static async createID(model: User) {
    model.id = 'usr_' + modelId()
  }

  public serializeExtras() {
    return {
      role: this.$extras.pivot_role,
      joined_at: this.$extras.pivot_created_at,
    }
  }

  public async isAdminOf(virtualNetwork: VirtualNetwork) {
    const userVirtualNetwork = await UserVirtualNetwork.query()
      .where('user_id', this.id)
      .where('virtual_network_id', virtualNetwork.id)
      .where('role', UserRole.Admin)
      .first()

    return !!userVirtualNetwork
  }

  public async getStripeSubcription() {
    if (!this.stripeSubscriptionId) {
      return null
    }
    const stripeSubscription = await Stripe.subscriptions.retrieve(this.stripeSubscriptionId)

    return stripeSubscription
  }
}
