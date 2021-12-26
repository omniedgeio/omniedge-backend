import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class AppProvider {
  constructor(protected app: ApplicationContract) {
  }

  public register() {
    // Register your own bindings
  }

  public async boot() {
    // IoC container is ready
    const Response = this.app.container.use('Adonis/Core/Response')

    Response.macro('format', function(status, data) {
      return this.status(status).json({
        code: status,
        ...(typeof data === 'string' ? { message: data } : { data }),
      })
    })

    Response.macro('formatError', function(status, code, message) {
      return this.status(status).json({
        code: code,
        message: message,
      })
    })

    Response.macro('formatError', function(status, code, message, errors) {
      return this.status(status).json({
        code: code,
        message: message,
        errors: { ...(errors) },
      })
    })
  }

  public async ready() {
    // App is ready
  }

  public async shutdown() {
    // Cleanup, since app is going down
  }
}
