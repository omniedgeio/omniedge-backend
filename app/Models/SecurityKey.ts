import {
  BaseModel,
  beforeCreate,
  BelongsTo,
  belongsTo,
  column,
} from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";
import { SecurityKeyType } from "./../../contracts/enum";
import { modelId } from "./../../utils/nanoid";
import User from "./User";

export default class SecurityKey extends BaseModel {
  @column({ isPrimary: true })
  public id: string;

  @column()
  public userId: string;

  @column()
  public hash: string;

  @column()
  public lstr: string;

  @column()
  public keyType: SecurityKeyType;

  @column.dateTime()
  public expiredAt: DateTime | null;

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @beforeCreate()
  public static async createID(model: SecurityKey) {
    model.id = "sck_" + modelId();
  }
}
