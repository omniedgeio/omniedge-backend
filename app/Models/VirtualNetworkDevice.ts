import { BaseModel, belongsTo, BelongsTo, column } from "@ioc:Adonis/Lucid/Orm";
import VirtualNetwork from "App/Models/VirtualNetwork";
import { DateTime } from "luxon";
import Device from "./Device";

export default class VirtualNetworkDevice extends BaseModel {
  public static table = "virtual_network_device";

  @column({ isPrimary: true })
  public id: number;

  @column()
  public deviceId: string;

  @column()
  public virtualNetworkId: string;

  @column()
  public virtualIp: string;

  @column.dateTime()
  public lastSeen: DateTime;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @belongsTo(() => Device)
  public user: BelongsTo<typeof Device>;

  @belongsTo(() => VirtualNetwork)
  public virtualNetwork: BelongsTo<typeof VirtualNetwork>;
}
