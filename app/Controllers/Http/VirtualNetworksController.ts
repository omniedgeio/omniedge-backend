import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { rules, schema } from "@ioc:Adonis/Core/Validator";
import UserVirtualNetwork from "App/Models/UserVirtualNetwork";
import VirtualNetwork from "App/Models/VirtualNetwork";
import VirtualNetworkDevice from "App/Models/VirtualNetworkDevice";
import { CustomReporter } from "App/Validators/Reporters/CustomReporter";
import { UserRole } from "./../../../contracts/enum";

export default class VirtualNetworksController {
  public async create({ request, response, auth }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [rules.maxLength(255)]),
        ip_range: schema.string({ trim: true }, [
          rules.regex(new RegExp(/^([0-9]{1,3}\.){3}[0-9]{1,3}($|\/(16|24))$/)),
        ]),
      }),
      messages: {
        "ip_range.regex": "Invalid IP range",
      },
      reporter: CustomReporter,
    });

    const virtualNetwork = await VirtualNetwork.create(data);

    await auth.user?.related("virtualNetworks").attach({
      [virtualNetwork.id]: {
        role: UserRole.Admin,
      },
    });

    return response.format(200, virtualNetwork);
  }

  public async list({ request, response, auth }: HttpContextContract) {
    const virtualNetworks = await auth.user
      ?.related("virtualNetworks")
      .query()
      .filter(request.qs())
      .withAggregate("users", (query) => {
        query.count("*").as("users_count");
      })
      .withAggregate("devices", (query) => {
        query.count("*").as("devices_count");
      })
      .paginate(
        Math.round(Math.max(request.input("page") || 1, 1)),
        Math.round(Math.max(request.input("per_page") || 10, 10))
      );

    return response.format(200, virtualNetworks?.serialize());
  }

  public async retrieve({ params, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related("virtualNetworks")
      .query()
      .where("virtual_networks.id", params.id)
      .withAggregate("users", (query) => {
        query.count("*").as("users_count");
      })
      .withAggregate("devices", (query) => {
        query.count("*").as("devices_count");
      })
      .first();

    if (!virtualNetwork) {
      return response.format(404, "Virtual network not found");
    }

    return response.format(200, virtualNetwork.serialize());
  }

  public async update({
    request,
    params,
    response,
    auth,
  }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [rules.maxLength(255)]),
      }),
      reporter: CustomReporter,
    });

    const virtualNetwork = await auth.user
      ?.related("virtualNetworks")
      .query()
      .where("virtual_networks.id", params.id)
      .first();

    if (!virtualNetwork) {
      return response.format(404, "Virtual network not found");
    }

    virtualNetwork.name = data.name;
    await virtualNetwork.save();

    return response.format(200, virtualNetwork);
  }

  public async delete({ params, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related("virtualNetworks")
      .query()
      .where("virtual_networks.id", params.id)
      .first();

    if (!virtualNetwork) {
      return response.format(404, "Virtual network not found");
    }

    await UserVirtualNetwork.query()
      .where("virtual_network_id", params.id)
      .delete();

    await VirtualNetworkDevice.query()
      .where("virtual_network_id", params.id)
      .delete();

    await virtualNetwork.delete();

    return response.format(200, "Virtual network deleted");
  }
}
