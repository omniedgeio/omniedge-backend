import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import omniedgeConfig from 'Contracts/omniedge'
import * as os from 'os'

export default class HealthController {
  public async health({ response }: HttpContextContract) {
    response.format(200, {
      'status': 'ok',
      'logLevel': Env.get('LOG_LEVEL', 'debug'),
      'gitSha': Env.get('GIT_SHA', '000000'),
      'gitTag': Env.get('GIT_TAG', ''),
      'buildTime':Env.get('BUILD_TIME',''),
      'startTime': omniedgeConfig.startTime,
      'host': os.hostname(),
    })
  }
}
