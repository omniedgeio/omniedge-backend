import { BaseModelFilter } from "@ioc:Adonis/Addons/LucidFilter";
import { ModelQueryBuilderContract } from "@ioc:Adonis/Lucid/Orm";
import VirtualNetwork from "App/Models/VirtualNetwork";

export default class VirtualNetworkFilter extends BaseModelFilter {
  public $query: ModelQueryBuilderContract<
    typeof VirtualNetwork,
    VirtualNetwork
  >;

  public name(name: string) {
    return this.$query.where("name", "like", `%${name}%`);
  }
}
