import { SignJWT } from 'jose/jwt/sign'
import Env from '@ioc:Adonis/Core/Env'
import { createPrivateKey, KeyObject } from 'crypto'
import Logger from '@ioc:Adonis/Core/Logger'

export function generateToken(
  expiresIn: string | number,
  payload: any = {},
): Promise<string> {
  let accessTokenBuilder = new SignJWT({ data: payload }).setProtectedHeader({ alg: 'RS256' }).setIssuedAt()
  if (expiresIn) {
    accessTokenBuilder = accessTokenBuilder.setExpirationTime(expiresIn)
  }
  Logger.info('Generating JWT token with payload: %s', Env.get('JWT_PRIVATE_KEY'))
  return accessTokenBuilder.sign(generateKey(Env.get('JWT_PRIVATE_KEY', '').replace(/\\n/g, '\n'))))
}

function generateKey(hash: string): KeyObject {
  return createPrivateKey(Buffer.from(hash))
}
