import Env from '@ioc:Adonis/Core/Env'
import { rules } from '@ioc:Adonis/Core/Validator'
import { DateTime } from 'luxon'

const omniedgeConfig = {
  startTime:DateTime.now(),
  clientUrl: Env.get('CLIENT_URL') as string,
  key: {
    signAlg: 'HS512',
    activateAccountKey: Env.get('JWT_PRIVATE_KEY').replace(/\\n/g, '\n'),
    forgetPasswordKey: Env.get('JWT_PRIVATE_KEY').replace(/\\n/g, '\n'),
    activateAccountExpiresIn: '1h',
    forgetPasswordExpiresIn: '600s',
  },
  mail: {
    senderAddress: Env.get('SES_SENDER_ADDRESS') as string,
    senderName: Env.get('SES_SENDER_NAME') as string,
  },
  rules: {
    nameRules: [rules.minLength(1), rules.maxLength(60)],
    passwordRules: [rules.minLength(8), rules.maxLength(32)],
  },
}

export default omniedgeConfig
