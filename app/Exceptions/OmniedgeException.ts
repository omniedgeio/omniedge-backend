import { Exception } from '@adonisjs/core/build/standalone'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class OmniedgeException extends Exception {
  public status: number
  public code: string
  public message: string
  public errors: string

  constructor(status: number, code: string, message: string, errors: any) {
    super(message, status, code)
    this.errors = errors
  }

  public async handle(error: this, ctx: HttpContextContract) {
    ctx.response.status(this.status).send({
      code: error.code,
      message: this.message,
      errors: error.errors,
    })
  }
}
