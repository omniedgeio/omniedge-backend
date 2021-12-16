import {
  BaseModel,
  beforeCreate,
  column,
  HasMany,
  hasMany,
} from "@ioc:Adonis/Lucid/Orm";
import { Country } from "Contracts/enum";
import { DateTime } from "luxon";
import { modelId } from "./../../utils/nanoid";
import VirtualNetwork from "./VirtualNetwork";

export default class Server extends BaseModel {
  @column({ isPrimary: true })
  public id: string;

  @column()
  public name: string;

  @column()
  public host: string;

  @column()
  public country: Country;

  @hasMany(() => VirtualNetwork)
  public virtualNetworks: HasMany<typeof VirtualNetwork>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @beforeCreate()
  public static async createID(model: Server) {
    model.id = "svr_" + modelId();
  }
}
