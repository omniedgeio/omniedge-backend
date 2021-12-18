import {HttpContextContract} from "@ioc:Adonis/Core/HttpContext";
import {rules, schema} from '@ioc:Adonis/Core/Validator'

export default class SecurityKeysController {
  public async create({request, response, auth}: HttpContextContract) {
    const createSchema = schema.create({
      name: schema.string({trim: true}, [
        rules.maxLength(60)
      ]),
      type: schema.enum([1, 2] as const)
    })
    const payload = await request.validate({schema: createSchema})
    let token;
    switch (payload.type) {
      case 1:
        token = await auth.use('key').generate(auth.user!!, {
          expiresIn: process.env.LOGIN_TOKEN,
          name: payload.name,
        })
        response.status(200).send(token)
        return
      case 2:
        token = await auth.use('key').generate(auth.user!!, {
          expiresIn: process.env.LOGIN_TOKEN,
          name: payload.name,
        })
        response.status(200).send(token)
        break
    }

  }
}
