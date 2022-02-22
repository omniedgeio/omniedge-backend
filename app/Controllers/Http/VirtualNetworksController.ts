import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Logger from '@ioc:Adonis/Core/Logger'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Invitation from 'App/Models/Invitation'
import Server from 'App/Models/Server'
import User from 'App/Models/User'
import UserVirtualNetwork from 'App/Models/UserVirtualNetwork'
import VirtualNetwork from 'App/Models/VirtualNetwork'
import VirtualNetworkDevice from 'App/Models/VirtualNetworkDevice'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import crypto from 'crypto'
import geoip from 'geoip-lite'
import { DateTime } from 'luxon'
import { Netmask } from 'netmask'
import { nextUnassignedIP } from '../../../utils/ip'
import { InvitationStatus, ServerType, UsageKey, UserRole } from './../../../contracts/enum'

export default class VirtualNetworksController {
  hostnameWithPortRegex = '([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}:[0-9]{1,5})|([a-z]+.[a-z]+.[a-z]+:[0-9]{1,5})'
  public async create({ request, response, auth }: HttpContextContract) {
    const v4str =
      '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}\\/(3[0-2]|[12]?[0-9])'
    const data = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [rules.maxLength(255)]),
        ip_range: schema.string({ trim: true }, [rules.regex(new RegExp(v4str))]),
        server: schema.object.optional().members({
          host: schema.string.optional({ trim: true }, [rules.hostname()]),
          port: schema.number.optional([rules.range(1, 65535)]),
        }),
      }),
      messages: {
        'ip_range.regex': 'Invalid IP range',
        'server.host.regex': 'Invalid hostname',
      },
      reporter: CustomReporter,
    })

    const user = auth.user!
    const limit = await user.getLimit(UsageKey.VirtualNetworks)
    const usage = await user.getUsage(UsageKey.VirtualNetworks)

    if (usage >= limit) {
      return response.format(400, 'You have reached the limit of virtual networks')
    }

    const virtualNetwork = new VirtualNetwork()
    virtualNetwork.fill(data)

    let server: Server | null

    if (data.server?.host) {
      if (await user.isFreePlan()) {
        return response.format(400, 'Please upgrade your plan to support customized supernode')
      }
      const location = geoip.lookup(data.server.host)
      server = await Server.create({
        host: `${data.server.host}:${data.server.port || 5565}`,
        name: 'Custom server',
        country: location ? location.country : null,
        type: ServerType.SelfHosted,
      })
    } else {
      const location = geoip.lookup(request.ip())
      Logger.debug('request ip is %s', request.ip())
      let query = Server.query().where('type', ServerType.Default)
      if (location && location.timezone.includes('Asia')) {
        server = await query.where('country', 'HK').first()
      } else if (location && location.timezone.includes('Europe')) {
        server = await query.where('country', 'DE').first()
      } else {
        server = await query.where('country', 'US').first()
      }
    }

    if (server) {
      virtualNetwork.serverId = server.id
    } else {
      return response.format(400, 'No server available')
    }

    await virtualNetwork.save()
    await auth.user?.related('virtualNetworks').attach({
      [virtualNetwork.id]: {
        role: UserRole.Admin,
      },
    })

    if (virtualNetwork.serverId) {
      await virtualNetwork.load('server')
    }

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
        server: schema.object.optional().members({
          host: schema.string.optional({ trim: true }, [rules.hostname()]),
          port: schema.number.optional([rules.range(1, 65535)]),
        }),
      }),
      reporter: CustomReporter,
    })

    const user = auth.user!
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    await virtualNetwork.load('server')
    const server = virtualNetwork.server

    if (data.server?.host) {
      if (await user.isFreePlan()) {
        return response.format(400, 'Please upgrade your plan to support customized supernode')
      }
      if (server.type === ServerType.SelfHosted) {
        server.host = `${data.server.host}:${data.server.port || 7787}`
        await server.save()
      } else {
        const location = geoip.lookup(data.server.host)
        const newServer = await Server.create({
          host: `${data.server.host}:${data.server.port || 7787}`,
          name: 'Custom server',
          country: location ? location.country : null,
          type: ServerType.SelfHosted,
        })
        virtualNetwork.serverId = newServer.id
      }
    } else {
      if (server.type === ServerType.SelfHosted) {
        let chosenServer
        const location = geoip.lookup(request.ip())
        Logger.debug('request ip is %s', request.ip())
        let query = Server.query().where('type', ServerType.Default)
        if (location && location.timezone.includes('Asia')) {
          chosenServer = await query.where('country', 'HK').first()
        } else if (location && location.timezone.includes('Europe')) {
          chosenServer = await query.where('country', 'DE').first()
        } else {
          chosenServer = await query.where('country', 'US').first()
        }

        if (chosenServer) {
          virtualNetwork.serverId = chosenServer.id
          await virtualNetwork.save()
          await server.delete()
        }
      }
    }

    virtualNetwork.name = data.name
    await virtualNetwork.save()

    await virtualNetwork.load('server')

    return response.format(200, virtualNetwork)
  }

  public async delete({ params, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .preload('server')
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    await Database.transaction(async (trx) => {
      await Invitation.query({ client: trx }).where('virtual_network_id', params.id).delete()

      await UserVirtualNetwork.query({ client: trx }).where('virtual_network_id', params.id).delete()

      await VirtualNetworkDevice.query({ client: trx }).where('virtual_network_id', params.id).delete()

      await virtualNetwork.useTransaction(trx).delete()

      if (virtualNetwork.server.type === ServerType.SelfHosted) {
        await virtualNetwork.server.useTransaction(trx).delete()
      }
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

  public async joinDevice({ params, response, auth }: HttpContextContract) {
    const virtualNetwork = await auth.user
      ?.related('virtualNetworks')
      .query()
      .where('virtual_networks.id', params.id)
      .first()

    if (!virtualNetwork) {
      return response.format(404, 'Virtual network not found')
    }

    const device = await auth.user?.related('devices').query().where('devices.id', params.device_id).first()

    if (!device) {
      return response.format(404, 'Device not found')
    }

    const virtualNetworkDevices = await VirtualNetworkDevice.query()
      .where('virtual_network_id', params.id)
      .select('virtual_ip')
    const usedIPs = virtualNetworkDevices.map((device) => device.virtualIp)

    const nextIP = nextUnassignedIP(virtualNetwork.ipRange, usedIPs)
    if (!nextIP) {
      return response.format(400, 'No available IPs')
    }

    const virtualNetworkDevice = await VirtualNetworkDevice.firstOrCreate(
      {
        deviceId: device.id,
        virtualNetworkId: virtualNetwork.id,
      },
      {
        virtualIp: nextIP,
        lastSeen: DateTime.now(),
      }
    )

    await virtualNetwork.load('server')

    const communityName = crypto.createHash('sha256').update(virtualNetwork.id).digest('hex').slice(0, 8)
    const secretKey = crypto.createHash('sha256').update(communityName).digest('hex').slice(0, 8)
    const netmask = new Netmask(virtualNetwork.ipRange)

    return response.format(200, {
      community_name: communityName,
      secret_key: secretKey,
      virtual_ip: virtualNetworkDevice.virtualIp,
      subnet_mask: netmask.mask,
      server: {
        name: virtualNetwork.server.name,
        host: virtualNetwork.server.host,
        country: virtualNetwork.server.country,
      },
    })

    return response.format(200, 'Join device successfully')
  }

  /* -------------------------------------------------------------------------- */
  /*                        Virtual Network > Invitations                       */

  /* -------------------------------------------------------------------------- */

  public async createInvitation({ params, request, response, auth }: HttpContextContract) {
    const data = await request.validate({
      schema: schema.create({
        email: schema.string({ trim: true }, [rules.email({ sanitize: true })]),
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

    const user = await User.query().select('id').where('email', data.email).first()
    if (!user) {
      return response.format(404, 'User not available')
    }

    const isUserInVirtualNetwork = await virtualNetwork.related('users').query().where('user_id', user.id).first()
    if (isUserInVirtualNetwork) {
      return response.format(400, 'User already in virtual network')
    }

    let invitation = await virtualNetwork.related('invitations').query().where('invited_user_id', user.id).first()

    if (invitation) {
      if (invitation.status === InvitationStatus.Pending) {
        return response.format(400, 'Invitation already pending')
      }
      invitation.status = InvitationStatus.Pending
      await invitation.save()
    } else {
      invitation = await virtualNetwork.related('invitations').create({
        invitedUserId: user.id,
        invitedByUserId: auth.user?.id,
        virtualNetworkId: virtualNetwork.id,
        status: InvitationStatus.Pending,
      })
    }

    return response.format(200, invitation)
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

    const invitation = await virtualNetwork.related('invitations').query().where('id', params.invitation_id).first()

    if (!invitation) {
      return response.format(404, 'Invitation not found')
    }
    await invitation.delete()

    return response.format(200, 'Deleted invitation successfully')
  }
}
