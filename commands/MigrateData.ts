import { BaseCommand } from '@adonisjs/core/build/standalone'
import AWS from 'aws-sdk'
import { UserRole } from 'Contracts/enum'
import { DateTime } from 'luxon'

export default class MigrateData extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'migrate:data'

  /**
   * Command description is displayed in the "help" output
   */
  public static description = ''

  public static settings = {
    /**
     * Set the following value to true, if you want to load the application
     * before running the command. Don't forget to call `node ace generate:manifest`
     * afterwards.
     */
    loadApp: true,

    /**
     * Set the following value to true, if you want this command to keep running until
     * you manually decide to exit the process. Don't forget to call
     * `node ace generate:manifest` afterwards.
     */
    stayAlive: false,
  }

  // Map old user ID to new user ID
  private userIDMap = {}

  // Map old user ID to new user ID
  private virtualNetworksIDMap = {}

  private tableNames = {
    'user': 'User-bp7n4uwfwvgnrmjup3gebsckyy-dev',
    'virtual-network': 'VirtualNetwork-bp7n4uwfwvgnrmjup3gebsckyy-dev',
    'device': 'Device-bp7n4uwfwvgnrmjup3gebsckyy-dev',
    'user-virtual-network': 'UserVirtualNetwork-bp7n4uwfwvgnrmjup3gebsckyy-dev',
  }

  private userPoolId = 'us-east-2_aokgDq2Kh'

  public async run() {
    await this.syncAllUsers()
    await this.syncAllVirtualNetworks()
    await this.syncAllDevices()
    await this.syncAllUserVirtualNetwork()
  }

  public async syncAllUsers() {
    const { default: User } = await import('App/Models/User')
    const { default: Plan } = await import('App/Models/Plan')
    const dynamoDB = new AWS.DynamoDB()
    const cognitoISP = new AWS.CognitoIdentityServiceProvider()
    const freePlan = await Plan.findBy('slug', 'free')
    if (!freePlan) {
      throw new Error('Free plan not found')
    }

    this.logger.info('Starting to sync users table')
    let token
    do {
      const data = await dynamoDB
        .scan({
          TableName: this.tableNames['user'],
          ExclusiveStartKey: token,
        })
        .promise()

      token = data.LastEvaluatedKey

      if (data.Items) {
        for (const user of data.Items) {
          if (!user.username) continue
          try {
            const identity = await cognitoISP
              .adminGetUser({
                UserPoolId: this.userPoolId,
                Username: user.username.S as string,
              })
              .promise()
            if (!identity || !identity.UserAttributes) continue

            const name = identity.UserAttributes.find((a) => a.Name === 'name')?.Value
            const email = identity.UserAttributes.find((a) => a.Name === 'email')?.Value

            if (!name || !email) continue

            const newUser = await User.firstOrCreate(
              {
                cognitoId: user.username.S as string,
                ddbUUID: user.id.S,
              },
              {
                email: email,
                name: name,
                password: '',
                createdAt: DateTime.fromISO(user.createdAt.S as string),
                updatedAt: DateTime.fromISO(user.updateAt.S as string),
                planId: freePlan?.id,
              }
            )

            if (newUser.cognitoId.includes('google')) {
              newUser.related('identities').firstOrCreate({
                provider: 'google',
                providerUserId: newUser.cognitoId.replace('google_', ''),
              })
            }

            this.userIDMap[user.id.S as string] = newUser.id

            this.logger.info(`Imported user: ${user.id.S} => ${newUser.id} ${newUser.name}`)
          } catch (err) {
            this.logger.error(err)
          }
        }
      }
    } while (token)
  }

  public async syncAllVirtualNetworks() {
    const { default: Server } = await import('App/Models/Server')
    const { default: VirtualNetwork } = await import('App/Models/VirtualNetwork')
    const { default: UserVirtualNetwork } = await import('App/Models/UserVirtualNetwork')

    const dynamoDB = new AWS.DynamoDB()
    const server = await Server.first()

    this.logger.info('Starting to sync virtual networks table')
    let token
    do {
      const data = await dynamoDB
        .scan({
          TableName: this.tableNames['virtual-network'],
          ExclusiveStartKey: token,
          Limit: 100,
        })
        .promise()
      token = data.LastEvaluatedKey

      if (data.Items) {
        for (const virtualNetwork of data.Items) {
          try {
            const userDDBId = virtualNetwork.ownerID.S as string
            if (!this.userIDMap[userDDBId]) {
              this.logger.error(`Skipped ${virtualNetwork.id.S}`)
              continue
            }

            const newVirtualNetwork = await VirtualNetwork.firstOrCreate(
              {
                ddbUUID: virtualNetwork.id.S,
              },
              {
                name: 'My Omni Network',
                ipRange: virtualNetwork.ipPrefix.S,
                createdAt: DateTime.fromISO(virtualNetwork.createdAt.S as string),
                updatedAt: DateTime.fromISO(virtualNetwork.updateAt.S as string),
                serverId: server?.id,
              }
            )

            await UserVirtualNetwork.firstOrCreate(
              {
                userId: this.userIDMap[userDDBId],
                virtualNetworkId: newVirtualNetwork.id,
              },
              {
                role: UserRole.Admin,
                createdAt: DateTime.fromISO(virtualNetwork.createdAt.S as string),
                updatedAt: DateTime.fromISO(virtualNetwork.updateAt.S as string),
              }
            )

            this.virtualNetworksIDMap[virtualNetwork.id.S as string] = newVirtualNetwork.id

            this.logger.info(`Imported virtual network: ${virtualNetwork.id.S} => ${newVirtualNetwork.id}`)
          } catch (err) {
            this.logger.error(err)
          }
        }
      }
    } while (token)
  }

  public async syncAllDevices() {
    const { default: Device } = await import('App/Models/Device')
    const { default: VirtualNetworkDevice } = await import('App/Models/VirtualNetworkDevice')

    const dynamoDB = new AWS.DynamoDB()

    this.logger.info('Starting to sync devices table')
    let token
    do {
      const data = await dynamoDB
        .scan({
          TableName: this.tableNames['device'],
          ExclusiveStartKey: token,
          Limit: 100,
        })
        .promise()
      token = data.LastEvaluatedKey

      if (data.Items) {
        for (const device of data.Items) {
          const userDDBId = device.ownerID.S as string
          if (!device.instanceID || !device.ownerID || !this.userIDMap[userDDBId]) {
            this.logger.error(`Skipped ${device.id.S}`)
            continue
          }

          const newDevice = await Device.firstOrCreate(
            {
              hardwareId: device.instanceID.S,
            },
            {
              userId: this.userIDMap[device.ownerID.S as string],
              name: device.name?.S || device.description?.S || '',
              platform: device.userAgent.S === 'WINDOWS' ? device.description.S : device.userAgent.S,
              createdAt: DateTime.fromISO(device.createdAt.S as string),
              updatedAt: DateTime.fromISO(device.updateAt.S as string),
            }
          )

          await VirtualNetworkDevice.firstOrCreate(
            {
              deviceId: newDevice.id,
              virtualNetworkId: this.virtualNetworksIDMap[device.virtualNetworkID.S as string],
            },
            {
              virtualIp: device.virtualIP.S,
              createdAt: DateTime.fromISO(device.createdAt.S as string),
              updatedAt: DateTime.fromISO(device.updateAt.S as string),
            }
          )

          this.logger.info(`Created device: ${device.id.S} => ${newDevice.id}`)
        }
      }
    } while (token)
  }

  public async syncAllUserVirtualNetwork() {
    const { default: UserVirtualNetwork } = await import('App/Models/UserVirtualNetwork')

    const dynamoDB = new AWS.DynamoDB()

    this.logger.info('Starting to sync user-virtual-network table')
    let token
    do {
      const data = await dynamoDB
        .scan({
          TableName: this.tableNames['user-virtual-network'],
          ExclusiveStartKey: token,
          Limit: 100,
        })
        .promise()
      token = data.LastEvaluatedKey

      if (data.Items) {
        for (const uvn of data.Items) {
          const userDDBId = uvn.userID.S as string
          const vnDDBId = uvn.virtualNetworkID.S as string

          if (!this.userIDMap[userDDBId] || !this.virtualNetworksIDMap[vnDDBId]) {
            this.logger.error(`Skipped ${uvn.id.S}`)
            continue
          }

          const newUserVirtualNetwork = await UserVirtualNetwork.firstOrCreate(
            {
              userId: this.userIDMap[uvn.userID.S as string],
              virtualNetworkId: this.virtualNetworksIDMap[uvn.virtualNetworkID.S as string],
            },
            {
              role: UserRole.User,
              createdAt: DateTime.fromISO(uvn.createdAt.S as string),
              updatedAt: DateTime.fromISO(uvn.updateAt.S as string),
            }
          )

          this.logger.info(`Created user virtual network: ${uvn.id.S} => ${newUserVirtualNetwork.id}`)
        }
      }
    } while (token)
  }
}
