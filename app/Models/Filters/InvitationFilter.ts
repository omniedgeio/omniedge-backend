import { BaseModelFilter } from "@ioc:Adonis/Addons/LucidFilter";
import { ModelQueryBuilderContract } from "@ioc:Adonis/Lucid/Orm";
import Invitation from "App/Models/Invitation";

export default class InvitationFilter extends BaseModelFilter {
  public $query: ModelQueryBuilderContract<typeof Invitation, Invitation>;

  // public method (value: any): void {
  //   this.$query.where('name', value)
  // }

  public virtualNetwork(value: string) {
    this.$query.where("virtual_network_id", value);
  }
}
