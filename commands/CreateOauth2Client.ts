import { BaseCommand } from '@adonisjs/core/build/standalone'

export default class CreateOauth2Client extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'create:oauth2_client'

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

  public async run() {
    const { default: Oauth2Client } = await import('App/Models/Oauth2Client')
    const clientId = Oauth2Client.generateClientIdOrSecret()
    const clientSecret = Oauth2Client.generateClientIdOrSecret()

    await Oauth2Client.create({
      clientId,
      clientSecret
    })
    this.logger.info(`create oauth2 client sucess: client_id = ${clientId}, client_secret = ${clientSecret}`)
  }
}
