import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { rules, schema } from "@ioc:Adonis/Core/Validator";
import Device from "App/Models/Device";
import User from "App/Models/User";
import UserVirtualNetwork from "App/Models/UserVirtualNetwork";
import VirtualNetworkDevice from "App/Models/VirtualNetworkDevice";
import { UserRole } from "Contracts/enum";

export default class UsersController {
  public async list({ request, response, auth }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        virtual_network: schema.string({}, [rules.required()]),
      }),
      messages: {
        "virtual_network.required": "Please provide virtual network's id",
      },
    });

    const virtualNetwork = await auth.user
      ?.related("virtualNetworks")
      .query()
      .select("id")
      .where("virtual_networks.id", data.virtual_network)
      .first();

    if (!virtualNetwork) {
      return response.format(404, "Virtual network not found");
    }

    const users = await User.query()
      .select(
        "users.id",
        "users.name",
        "users.email",
        "user_virtual_network.role as role"
      )
      .innerJoin(
        "user_virtual_network",
        "users.id",
        "user_virtual_network.user_id"
      )
      .where("user_virtual_network.virtual_network_id", data.virtual_network)
      .paginate(
        Math.round(Math.max(request.input("page") || 1, 1)),
        Math.round(Math.max(request.input("per_page") || 10, 10))
      );

    return response.format(200, users.serialize());
  }

  public async delete({
    params,
    request,
    response,
    auth,
  }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        virtual_network: schema.string({}, [rules.required()]),
      }),
      messages: {
        "virtual_network.required": "Please provide virtual network's id",
      },
    });

    const virtualNetwork = await auth.user
      ?.related("virtualNetworks")
      .query()
      .select("id")
      .where("virtual_networks.id", data.virtual_network)
      .first();

    if (!virtualNetwork) {
      return response.format(404, "Virtual network not found");
    }

    if (virtualNetwork.$extras.pivot_role !== UserRole.Admin) {
      return response.format(403, "You are not allowed to delete user");
    }

    const deviceIds = await (
      await Device.query().select("id").where("user_id", params.id)
    ).map((d) => d.id);

    const user = await UserVirtualNetwork.query()
      .where("user_id", params.id)
      .where("virtual_network_id", data.virtual_network)
      .first();

    if (!user) {
      return response.format(404, "User not found");
    }

    await user.delete();

    await VirtualNetworkDevice.query()
      .whereIn("device_id", deviceIds)
      .where("virtual_network_id", data.virtual_network)
      .delete();

    return response.format(200, "User removed from virtual network.");
  }
}
