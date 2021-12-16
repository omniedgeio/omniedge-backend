import {
  BaseModel,
  beforeCreate,
  belongsTo,
  BelongsTo,
  column,
} from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";
import { modelId } from "./../../utils/nanoid";
import User from "./User";
import VirtualNetwork from "./VirtualNetwork";

export default class Invitation extends BaseModel {
  @column({ isPrimary: true })
  public id: string;

  // User who got the invitation
  @column()
  public invitedUserId: string;

  // User who sent the invitation
  @column()
  public invitedByUserId: string;

  @column()
  public VirtualNetworkId: string;

  @belongsTo(() => User, {
    foreignKey: "invited_user_id",
  })
  public invited: BelongsTo<typeof User>;

  @belongsTo(() => User, {
    foreignKey: "invited_by_user_id",
  })
  public invitedBy: BelongsTo<typeof User>;

  @belongsTo(() => VirtualNetwork)
  public virtualNetwork: BelongsTo<typeof VirtualNetwork>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @beforeCreate()
  public static async createID(model: Invitation) {
    model.id = "inv_" + modelId();
  }
}
