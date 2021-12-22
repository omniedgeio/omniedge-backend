import { Filterable } from "@ioc:Adonis/Addons/LucidFilter";
import { compose } from "@ioc:Adonis/Core/Helpers";
import {
  BaseModel,
  beforeCreate,
  BelongsTo,
  belongsTo,
  column,
  HasMany,
  hasMany,
  ManyToMany,
  manyToMany,
} from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";
import { modelId } from "./../../utils/nanoid";
import Device from "./Device";
import VirtualNetworkFilter from "./Filters/VirtualNetworkFilter";
import Invitation from "./Invitation";
import Server from "./Server";
import User from "./User";

export default class VirtualNetwork extends compose(BaseModel, Filterable) {
  public static $filter = () => VirtualNetworkFilter;

  @column({ isPrimary: true })
  public id: string;

  @column()
  public name: string;

  @column()
  public ipRange: string;

  @column()
  public serverId: number;

  @belongsTo(() => Server)
  public server: BelongsTo<typeof Server>;

  @manyToMany(() => Device, {
    pivotTable: "virtual_network_device",
    pivotColumns: ["virtual_ip"],
  })
  public devices: ManyToMany<typeof Device>;

  @manyToMany(() => User, {
    pivotTable: "user_virtual_network",
    pivotColumns: ["role"],
  })
  public users: ManyToMany<typeof User>;

  @hasMany(() => Invitation)
  public invitations: HasMany<typeof Invitation>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @beforeCreate()
  public static async createID(model: VirtualNetwork) {
    model.id = "vnw_" + modelId();
  }

  public serializeExtras() {
    return {
      role: this.$extras.pivot_role,
      virtual_ip: this.$extras.pivot_virtual_ip,
      users_count: this.$extras.users_count
        ? parseInt(this.$extras.users_count)
        : undefined,
      devices_count: this.$extras.devices_count
        ? parseInt(this.$extras.devices_count)
        : undefined,
    };
  }
}
