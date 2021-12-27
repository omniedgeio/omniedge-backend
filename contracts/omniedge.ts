import Env from '@ioc:Adonis/Core/Env'
import { rules } from '@ioc:Adonis/Core/Validator'

const omniedgeConfig = {
  key: {
    AUTH_EMAIL_PRIVATE_KEY: Env.get('JWT_PRIVATE_KEY').replace(/\\n/g, '\n'),

  },
  mail: {
    senderAddress: Env.get('SES_SENDER_ADDRESS') as string,
    baseUrl: Env.get('EMAIL_BASE_URL') as string,
  },
  rules: {
    nameRules: [rules.minLength(1), rules.maxLength(60)],
    passwordRules: [rules.minLength(8), rules.maxLength(32)],
  },
}

export default omniedgeConfig
