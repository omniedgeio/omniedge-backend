import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";

/*
|--------------------------------------------------------------------------
| Exception
|--------------------------------------------------------------------------
|
| The Exception class imported from `@adonisjs/core` allows defining
| a status code and error code for every exception.
|
| @example
| new ValidationException('message', 500, 'E_RUNTIME_EXCEPTION')
|
*/
export default class ValidationException extends Exception {
  public errors: string;

  constructor(errors: any) {
    super(errors, 422, "E_VALIDATION_FAILED");
    this.errors = errors;
  }

  public async handle(error: this, ctx: HttpContextContract) {
    ctx.response.status(422).send({
      code: error.code,
      message: "Validation failed",
      errors: error.errors,
    });
  }
}
