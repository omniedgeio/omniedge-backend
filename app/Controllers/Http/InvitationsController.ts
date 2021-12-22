import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { rules, schema } from "@ioc:Adonis/Core/Validator";
import Invitation from "App/Models/Invitation";
import User from "App/Models/User";
import UserVirtualNetwork from "App/Models/UserVirtualNetwork";
import { CustomReporter } from "App/Validators/Reporters/CustomReporter";
import { InvitationStatus, UserRole } from "./../../../contracts/enum";

export default class InvitationsController {
  public async create({ request, response, auth }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        virtual_network: schema.string(),
        emails: schema.array().members(
          schema.string({}, [
            rules.required(),
            rules.email({
              sanitize: true,
            }),
            rules.exists({
              table: "users",
              column: "email",
            }),
          ])
        ),
      }),
      messages: {
        "emails.*.exists": "User not found",
      },
      reporter: CustomReporter,
    });

    const virtualNetwork = await auth.user
      ?.related("virtualNetworks")
      .query()
      .where("virtual_networks.id", data.virtual_network)
      .first();

    if (!virtualNetwork) {
      return response.format(404, "Virtual network not found");
    }

    if (virtualNetwork.$extras.pivot_role !== UserRole.Admin) {
      return response.format(403, "You are not authorized to invite users");
    }

    const users = await User.query()
      .select("id")
      .whereNot("email", auth.user?.email as string)
      .whereIn("email", data.emails);

    await virtualNetwork.related("invitations").createMany(
      users.map((user) => ({
        invitedUserId: user.id,
        invitedByUserId: auth.user!.id,
        virtualNetworkId: virtualNetwork.id,
      }))
    );

    return response.format(200, "Invitations sent");
  }

  public async list({ request, response, auth }: HttpContextContract) {
    const virtualNetworks = await auth.user
      ?.related("virtualNetworks")
      .query()
      .select("id")
      .where("user_virtual_network.role", UserRole.Admin);

    const virtualNetworkIds = virtualNetworks?.map((vn) => vn.id) || [];

    const invitations = await Invitation.query()
      .whereIn("virtual_network_id", virtualNetworkIds)
      .orWhere("invited_user_id", auth.user?.id as string)
      .where("status", InvitationStatus.Pending)
      .preload("virtualNetwork", (query) => query.select("id", "name"))
      .preload("invited", (query) => query.select("id", "name", "email"))
      .preload("invitedBy", (query) => query.select("id", "name", "email"))
      .paginate(
        Math.round(Math.max(request.input("page") || 1, 1)),
        Math.round(Math.max(request.input("per_page") || 10, 10))
      );

    return response.format(200, invitations?.serialize());
  }

  public async update({
    response,
    request,
    params,
    auth,
  }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        status: schema.enum(Object.values(InvitationStatus)),
      }),
      reporter: CustomReporter,
    });

    const virtualNetworks = await auth.user
      ?.related("virtualNetworks")
      .query()
      .select("id")
      .where("user_virtual_network.role", UserRole.Admin);

    const virtualNetworkIds = virtualNetworks?.map((vn) => vn.id) || [];

    const invitation = await Invitation.query()
      .whereIn("virtual_network_id", virtualNetworkIds)
      .orWhere("invited_user_id", auth.user?.id as string)
      .where("status", InvitationStatus.Pending)
      .where("id", params.id)
      .first();

    if (!invitation) {
      return response.format(404, "Invitation not found");
    }

    if (data.status === InvitationStatus.Accepted) {
      await UserVirtualNetwork.create({
        userId: invitation.invitedUserId,
        virtualNetworkId: invitation.virtualNetworkId,
        role: UserRole.User,
      });
    }

    invitation.status = data.status as InvitationStatus;

    return response.format(200, "Invitation updated successfully");
  }
}
