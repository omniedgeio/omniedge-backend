import { SignJWT } from 'jose/jwt/sign'
import * as jose from 'jose/jwt/verify'
import { createPrivateKey, KeyObject } from 'crypto'
import { DateTime } from 'luxon'
import JwtAuthenticationException from '@ivyxjc/adonis5-jwt/build/lib/Exceptions/JwtAuthenticationException'
import { JWTCustomPayload } from '@ioc:Adonis/Addons/Jwt'

export function generateToken(
  expiresIn: string | number,
  payload: any = {},
  privateKey: string,
): Promise<string> {
  let accessTokenBuilder = new SignJWT({ data: payload }).setProtectedHeader({ alg: 'RS256' }).setIssuedAt()
  if (expiresIn) {
    accessTokenBuilder = accessTokenBuilder.setExpirationTime(expiresIn)
  }
  return accessTokenBuilder.sign(generateKey(privateKey))
}

export async function verifyToken(token: string, privateKey: string): Promise<JWTCustomPayload> {
  const secret = generateKey(privateKey)
  const { payload } = await jose.jwtVerify(token, secret, {})
  const { data, exp } = payload
  if (!data) {
    throw new JwtAuthenticationException('Invalid JWT payload')
  }
  if (exp && exp < Math.floor(DateTime.now().toSeconds())) {
    throw new JwtAuthenticationException('Expired JWT token')
  }
  return payload
}

function generateKey(hash: string): KeyObject {
  return createPrivateKey(Buffer.from(hash))
}
