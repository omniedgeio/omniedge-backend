import {
  BaseModel,
  beforeCreate,
  BelongsTo,
  belongsTo,
  column,
  ManyToMany,
  manyToMany,
} from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";
import { modelId } from "./../../utils/nanoid";
import Device from "./Device";
import Server from "./Server";
import User from "./User";

export default class VirtualNetwork extends BaseModel {
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
  })
  public devices: ManyToMany<typeof Device>;

  @manyToMany(() => User, {
    pivotTable: "user_virtual_network",
  })
  public users: ManyToMany<typeof User>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @beforeCreate()
  public static async createID(model: VirtualNetwork) {
    model.id = "vnw_" + modelId();
  }
}
