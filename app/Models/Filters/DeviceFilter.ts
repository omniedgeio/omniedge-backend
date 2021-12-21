import { BaseModelFilter } from "@ioc:Adonis/Addons/LucidFilter";
import { ModelQueryBuilderContract } from "@ioc:Adonis/Lucid/Orm";
import Device from "App/Models/Device";

export default class DeviceFilter extends BaseModelFilter {
  public $query: ModelQueryBuilderContract<typeof Device, Device>;

  // public method (value: any): void {
  //   this.$query.where('name', value)
  // }

  public name(value: string) {
    this.$query.where("name", "like", `%${value}%`);
  }

  public platform(value: string) {
    this.$query.where("platform", "ilike", `%${value}%`);
  }

  public virtualNetworks(value: string[]) {
    this.$query.whereHas("virtualNetworks", (query) => {
      query.whereIn("virtual_networks.id", value);
    });
  }
}
