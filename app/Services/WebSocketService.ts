import Env from '@ioc:Adonis/Core/Env'
import IWebSocketService, { IAuthSession } from 'Contracts/interfaces/WebSocketService'
import { DateTime } from 'luxon'
import WebSocket, { WebSocketServer } from 'ws'

export default class WebsocketService implements IWebSocketService {
  private webSocketServer: WebSocketServer

  private authSessions: Record<string, IAuthSession> = {}

  constructor() {
    this.webSocketServer = new WebSocketServer({ port: Env.get('WS_PORT') })
    this.webSocketServer.on('connection', (ws: WebSocket, request, _) => {
      if (
        request.url.includes('/login/session/') &&
        this.authSessions[request.url.replace('/login/session/', '') as string]
      ) {
        const sessionID = request.url.replace('/login/session/', '') as string
        this.authSessions[sessionID].Conn = ws
      } else {
        ws.close()
      }

      ws.onmessage = event => {
        ws.send(event.data)
      }
    })
  }

  public createAuthSession(sessionId: string, expiredAt: DateTime) {
    this.authSessions[sessionId] = {
      ExpiredAt: expiredAt,
    }
  }

  public notifyTokenResponse(sessionId: string, token: string): void {
    if (
      this.authSessions[sessionId] &&
      this.authSessions[sessionId].Conn &&
      this.authSessions[sessionId].ExpiredAt > DateTime.now()
    ) {
      this.authSessions[sessionId].Conn?.send(JSON.stringify({ token }))
      this.authSessions[sessionId].Conn?.close()
    }
  }
}
