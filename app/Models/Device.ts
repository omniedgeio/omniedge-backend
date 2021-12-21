import {
  BaseModel,
  beforeCreate,
  belongsTo,
  BelongsTo,
  column,
  ManyToMany,
  manyToMany,
} from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";
import { modelId } from "./../../utils/nanoid";
import User from "./User";
import VirtualNetwork from "./VirtualNetwork";

export default class Device extends BaseModel {
  @column({ isPrimary: true })
  public id: string;

  @column()
  public userId: string;

  @column()
  public hardwareId: string;

  @column()
  public platform: string;

  @column()
  public name: string;

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>;

  @manyToMany(() => VirtualNetwork, {
    pivotTable: "virtual_network_device",
    pivotColumns: ["virtual_ip"],
  })
  public virtualNetworks: ManyToMany<typeof VirtualNetwork>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @beforeCreate()
  public static async createID(model: Device) {
    model.id = "dev_" + modelId();
  }

  public serializeExtras() {
    return {
      virtual_ip: this.$extras?.pivot_virtual_ip,
    };
  }
}
