/*
|--------------------------------------------------------------------------
| Validating Environment Variables
|--------------------------------------------------------------------------
|
| In this file we define the rules for validating environment variables.
| By performing validation we ensure that your application is running in
| a stable environment with correct configuration values.
|
| This file is read automatically by the framework during the boot lifecycle
| and hence do not rename or move this file to a different location.
|
*/

import Env from '@ioc:Adonis/Core/Env'

export default Env.rules({
  HOST: Env.schema.string({ format: 'host' }),
  PORT: Env.schema.number(),
  WS_PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  APP_NAME: Env.schema.string(),
  DRIVE_DISK: Env.schema.enum(['local'] as const),
  NODE_ENV: Env.schema.enum(['development', 'production', 'testing'] as const),
  PG_HOST: Env.schema.string({ format: 'host' }),
  PG_PORT: Env.schema.number(),
  PG_USER: Env.schema.string(),
  PG_PASSWORD: Env.schema.string.optional(),
  PG_DB_NAME: Env.schema.string(),
  // google auth
  GOOGLE_CLIENT_ID: Env.schema.string(),

  LOGIN_TOKEN_EXPIRE: Env.schema.string(),
  ONE_TIME_SECURITY_KEY_EXPIRE: Env.schema.number(),
  NORMAL_SECURITY_KEY_EXPIRE: Env.schema.number(),

  // stripe
  STRIPE_SECRET_KEY: Env.schema.string(),
  STRIPE_WEBHOOK_KEY: Env.schema.string(),
  STRIPE_API_VERSION: Env.schema.string(),

  CLIENT_URL: Env.schema.string(),

  // cognito
  COGNITO_USER_POOL_ID: Env.schema.string(),
  COGNITO_APP_CLIENT_ID: Env.schema.string(),

  // aws
  AWS_REGION: Env.schema.string(),
  AWS_ACCESS_KEY_ID: Env.schema.string(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string(),
})
