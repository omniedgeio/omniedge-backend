import {
  BaseModel,
  beforeCreate,
  belongsTo,
  BelongsTo,
  column,
} from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";
import { InvitationStatus } from "./../../contracts/enum";
import { modelId } from "./../../utils/nanoid";
import User from "./User";
import VirtualNetwork from "./VirtualNetwork";

export default class Invitation extends BaseModel {
  @column({ isPrimary: true })
  public id: string;

  // User who got the invitation
  @column({ serializeAs: null })
  public invitedUserId: string;

  // User who sent the invitation
  @column({ serializeAs: null })
  public invitedByUserId: string;

  @column({ serializeAs: null })
  public virtualNetworkId: string;

  @column()
  public status: InvitationStatus;

  @belongsTo(() => User, {
    foreignKey: "invitedUserId",
  })
  public invited: BelongsTo<typeof User>;

  @belongsTo(() => User, {
    foreignKey: "invitedByUserId",
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
