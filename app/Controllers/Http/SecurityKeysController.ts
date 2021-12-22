import {HttpContextContract} from "@ioc:Adonis/Core/HttpContext";
import {rules, schema} from '@ioc:Adonis/Core/Validator'
import {CustomReporter} from "App/Validators/Reporters/CustomReporter";

export default class SecurityKeysController {
  public async create({request, response, auth}: HttpContextContract) {
    const createSchema = schema.create({
      name: schema.string({trim: true}, [
        rules.maxLength(60)
      ]),
      type: schema.enum([1, 2] as const)
    })
    const payload = await request.validate({schema: createSchema, reporter: CustomReporter})
    let token;
    // todo save token to database (table security key)
    switch (payload.type) {
      case 1:
        token = await auth.use('jwt').generate(auth.user!!, {
          expiresIn: process.env.NORMAL_SECURITY_KEY_EXPIRE,
          name: payload.name,
        })
        response.format(200, token)
        return
      case 2:
        token = await auth.use('jwt').generate(auth.user!!, {
          //todo change expire time
          expiresIn: process.env.ONE_TIME_SECURITY_KEY_EXPIRE,
          name: payload.name,
        })
        response.format(200, token)
        break
    }
  }
}
