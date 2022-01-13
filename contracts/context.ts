import IWebSocketService from 'Contracts/interfaces/WebSocketService'

declare module '@ioc:Adonis/Core/HttpContext' {
  interface HttpContextContract {
    ws: IWebSocketService
  }
}
