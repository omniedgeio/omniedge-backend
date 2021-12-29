import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Invitation from 'App/Models/Invitation'
import User from 'App/Models/User'
import UserVirtualNetwork from 'App/Models/UserVirtualNetwork'
import VirtualNetwork from 'App/Models/VirtualNetwork'
import VirtualNetworkDevice from 'App/Models/VirtualNetworkDevice'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import { InvitationStatus, UserRole } from './../../../contracts/enum'

export default class VirtualNetworksController {
  public async create({ request, response, auth }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [rules.maxLength(255)]),
        ip_range: schema.string({ trim: true }, [
          rules.regex(new RegExp(/^([0-9]{1,3}\.){3}[0-9]{1,3}($|\/(16|24))$/)),
        ]),
        server_id: schema.string({ trim: true }, [
          rules.exists({ table: 'servers', column: 'id' }),
        ]),
      }),
      messages: {
        'ip_range.regex': 'Invalid IP range',
      },
      reporter: CustomReporter,
    })

    const virtualNetwork = await VirtualNetwork.create(data)

    await auth.user?.related('virtualNetworks').attach({
      [virtualNetwork.id]: {
        role: UserRole.Admin,
      },
    })

    await virtualNetwork.load('server')

    return response.format(200, virtualNetwork)
  }

  public async list({ request, response, auth }: HttpContextContract) {
    const virtualNetworks = await auth.user
      ?.related('virtualNetworks')
      .query()
      .filter(request.qs())
      .withAggregate('users', (query) => {
        query.count('*').as('users_count')
      })
      .withAggregate('devices', (query) => {
        query.count('*').as('devices_count')
      })
      .preload('server')
      .paginate(
        Math.round(Math.max(request.input('page') || 1, 1)),
        Math.round(Math.max(request.input('per_page') || 10, 10))
      )

    return response.format(200, virtualNetworks?.serialize())
  }

  public async retrieve({ params, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .withAggregate('users', (query) => {
        query.count('*').as('users_count')
      })
      .withAggregate('devices', (query) => {
        query.count('*').as('devices_count')
      })
      .preload('server')
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    return response.format(200, virtualNetwork.serialize())
  }

  public async update({ request, params, response, auth }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [rules.maxLength(255)]),
      }),
      reporter: CustomReporter,
    })

    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    virtualNetwork.name = data.name
    await virtualNetwork.save()

    return response.format(200, virtualNetwork)
  }

  public async delete({ params, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    await Database.transaction(async (trx) => {
      await Invitation.query({ client: trx }).where('virtual_network_id', params.id).delete()

      await UserVirtualNetwork.query({ client: trx })
        .where('virtual_network_id', params.id)
        .delete()

      await VirtualNetworkDevice.query({ client: trx })
        .where('virtual_network_id', params.id)
        .delete()

      await virtualNetwork.useTransaction(trx).delete()
    })

    return response.format(200, 'Virtual network deleted')
  }

  /* -------------------------------------------------------------------------- */
  /*                           Virtual Network > Users                          */
  /* -------------------------------------------------------------------------- */

  public async listUsers({ params, response, request, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    const users = await virtualNetwork
      .related('users')
      .query()
      .select('id', 'name', 'email', 'picture', 'status')
      .paginate(
        Math.round(Math.max(request.input('page') || 1, 1)),
        Math.round(Math.max(request.input('per_page') || 10, 10))
      )

    return response.format(200, users?.serialize())
  }

  public async updateUser({ params, request, response, auth }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        role: schema.enum(Object.values(UserRole)),
      }),
      reporter: CustomReporter,
    })

    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    if (!(await auth.user?.isAdminOf(virtualNetwork))) {
      return response.format(403, 'You are not authorized to update user')
    }

    const virtualNetworkUser = await UserVirtualNetwork.query()
      .where('virtual_network_id', params.id)
      .where('user_id', params.user_id)
      .first()

    if (!virtualNetworkUser) {
      return response.format(404, 'User not found')
    }

    virtualNetworkUser.role = data.role as UserRole
    await virtualNetworkUser.save()

    return response.format(200, 'Updated user successfully')
  }

  public async deleteUser({ params, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    if (!(await auth.user?.isAdminOf(virtualNetwork))) {
      return response.format(403, 'You are not authorized to delete user')
    }

    const virtualNetworkUserCount = await UserVirtualNetwork.query()
      .where('virtual_network_id', params.id)
      .count('* as total')

    if (parseInt(virtualNetworkUserCount[0].$extras.total) === 1) {
      return response.format(400, 'Virtual network must have at least one user')
    }

    const virtualNetworkUser = await UserVirtualNetwork.query()
      .where('virtual_network_id', params.id)
      .where('user_id', params.user_id)
      .first()

    if (!virtualNetworkUser) {
      return response.format(404, 'User not found')
    }

    await Database.transaction(async (trx) => {
      await VirtualNetworkDevice.query({ client: trx })
        .whereIn(
          'device_id',
          Database.from('devices').useTransaction(trx).select('id').where('user_id', params.user_id)
        )
        .delete()

      await virtualNetworkUser.useTransaction(trx).delete()
    })

    await virtualNetworkUser.delete()

    return response.format(200, 'Deleted user successfully.')
  }

  /* -------------------------------------------------------------------------- */
  /*                          Virtual Network > Devices                         */
  /* -------------------------------------------------------------------------- */

  public async listDevices({ params, request, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    if (!(await auth.user?.isAdminOf(virtualNetwork))) {
      return response.format(403, 'You are not authorized to list devices')
    }

    const devices = await virtualNetwork
      .related('devices')
      .query()
      .select('id', 'name', 'platform')
      .filter(request.qs())
      .paginate(
        Math.round(Math.max(request.input('page') || 1, 1)),
        Math.round(Math.max(request.input('per_page') || 10, 10))
      )

    return response.format(200, devices?.serialize())
  }

  public async deleteDevice({ params, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    if (!(await auth.user?.isAdminOf(virtualNetwork))) {
      return response.format(403, 'You are not authorized to delete device')
    }

    const virtualNetworkDevice = await VirtualNetworkDevice.query()
      .where('virtual_network_id', params.id)
      .where('device_id', params.device_id)
      .first()

    if (!virtualNetworkDevice) {
      return response.format(404, 'Device not found')
    }

    await virtualNetworkDevice.delete()

    return response.format(200, 'Deleted device successfully')
  }

  /* -------------------------------------------------------------------------- */
  /*                        Virtual Network > Invitations                       */
  /* -------------------------------------------------------------------------- */

  public async createInvitation({ params, request, response, auth }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        emails: schema.array().members(
          schema.string(
            {
              trim: true,
            },
            [rules.email()]
          )
        ),
      }),
      reporter: CustomReporter,
    })

    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    if (!(await auth.user?.isAdminOf(virtualNetwork))) {
      return response.format(403, 'You are not authorized to create invitation')
    }

    const users = await User.query().whereIn('email', data.emails)

    const invitations = await virtualNetwork.related('invitations').createMany(
      users.map((user) => ({
        invitedUserId: user.id,
        invitedByUserId: auth.user?.id,
        virtualNetworkId: virtualNetwork.id,
        status: InvitationStatus.Pending,
      }))
    )

    return response.format(200, invitations)
  }

  public async listInvitations({ params, request, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    if (!(await auth.user?.isAdminOf(virtualNetwork))) {
      return response.format(403, 'You are not authorized to list invitations')
    }

    const invitations = await virtualNetwork
      .related('invitations')
      .query()
      .preload('invited', (query) => query.select('id', 'name', 'email'))
      .preload('invitedBy', (query) => query.select('id', 'name', 'email'))
      .paginate(
        Math.round(Math.max(request.input('page') || 1, 1)),
        Math.round(Math.max(request.input('per_page') || 10, 10))
      )

    return response.format(200, invitations?.serialize())
  }

  public async deleteInvitation({ params, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    if (!(await auth.user?.isAdminOf(virtualNetwork))) {
      return response.format(403, 'You are not allowed to delete invitations')
    }

    const invitation = await virtualNetwork
      .related('invitations')
      .query()
      .where('id', params.invitation_id)
      .first()

    if (!invitation) {
      return response.format(404, 'Invitation not found')
    }
    await invitation.delete()

    return response.format(200, 'Deleted invitation successfully')
  }
}
