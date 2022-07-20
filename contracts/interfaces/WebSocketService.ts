import { DateTime } from 'luxon'
import WebSocket from 'ws'

export default interface IWebSocketService {
  createAuthSession(sessionId: string, expiredAt: DateTime): void

  notifyTokenResponse(sessionId: string, token: string, refreshToken: string): void
}

export interface IAuthSession {
  ExpiredAt: DateTime
  Conn?: WebSocket
}
