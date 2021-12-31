import { SignJWT } from 'jose/jwt/sign'
import * as jose from 'jose/jwt/verify'
import { createPrivateKey, createSecretKey, KeyObject } from 'crypto'
import { DateTime } from 'luxon'
import JwtAuthenticationException from '@ivyxjc/adonis5-jwt/build/lib/Exceptions/JwtAuthenticationException'
import { JWTCustomPayload } from '@ioc:Adonis/Addons/Jwt'
import omniedge from 'Contracts/omniedge'

export function generateToken(
  expiresIn: string | number,
  payload: any = {},
  privateKey: string,
): Promise<string> {
  let accessTokenBuilder = new SignJWT({ data: payload }).setProtectedHeader({ alg: omniedge.key.signAlg }).setIssuedAt()
  if (expiresIn) {
    accessTokenBuilder = accessTokenBuilder.setExpirationTime(expiresIn)
  }
  return accessTokenBuilder.sign(generateKey(omniedge.key.signAlg, privateKey))
}

export async function verifyToken(token: string, privateKey: string): Promise<JWTCustomPayload> {
  const secret = generateKey(omniedge.key.signAlg, privateKey)
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

/**
 * Converts key string to Buffer
 */
function generateKey(algorithm: string, hash: string): KeyObject {
  switch (algorithm) {
    case 'HS256':
    case 'HS384':
    case 'HS512':
      return createSecretKey(Buffer.from(hash))
    case 'RS256':
    case 'RS384':
    case 'RS512':
      return createPrivateKey(Buffer.from(hash))
    default:
      throw new Error('Unsupported algorithm')
  }
}
