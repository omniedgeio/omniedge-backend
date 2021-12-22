import { Filterable } from "@ioc:Adonis/Addons/LucidFilter";
import Hash from "@ioc:Adonis/Core/Hash";
import { compose } from "@ioc:Adonis/Core/Helpers";
import {
  BaseModel,
  beforeCreate,
  beforeSave,
  column,
  HasMany,
  hasMany,
  ManyToMany,
  manyToMany,
} from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";
import { UserStatus } from "./../../contracts/enum";
import { modelId } from "./../../utils/nanoid";
import Device from "./Device";
import UserFilter from "./Filters/UserFilter";
import Identity from "./Identity";
import Invitation from "./Invitation";
import PasswordReset from "./PasswordReset";
import SecurityKey from "./SecurityKey";
import VirtualNetwork from "./VirtualNetwork";

export default class User extends compose(BaseModel, Filterable) {
  public static $filter = () => UserFilter;

  @column({ isPrimary: true })
  public id: string;

  @column()
  public name: string;

  @column()
  public email: string;

  @column({ serializeAs: null })
  public emailVerifiedAt: DateTime | null;

  @column({ serializeAs: null })
  public password: string | null;

  @column()
  public picture: string | null;

  @column()
  public lastLoginIp: string | null;

  @column()
  public lastLoginAt: DateTime | null;

  @column()
  public status: UserStatus;

  @hasMany(() => Device)
  public devices: HasMany<typeof Device>;

  @hasMany(() => Identity)
  public identities: HasMany<typeof Identity>;

  @manyToMany(() => VirtualNetwork, {
    pivotTable: "user_virtual_network",
    pivotColumns: ["role"],
  })
  public virtualNetworks: ManyToMany<typeof VirtualNetwork>;

  @hasMany(() => SecurityKey)
  public securityKeys: HasMany<typeof SecurityKey>;

  @hasMany(() => Invitation)
  public invitations: HasMany<typeof Invitation>;

  @hasMany(() => PasswordReset)
  public passwordResets: HasMany<typeof PasswordReset>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password as string);
    }
  }

  @beforeCreate()
  public static async createID(model: User) {
    model.id = "usr_" + modelId();
  }

  public serializeExtras() {
    return {
      role: this.$extras.role,
    };
  }
}
