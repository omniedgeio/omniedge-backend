declare module '@ioc:Adonis/Core/Response' {
  interface ResponseContract {
    format(status: number, data: any): void;

    formatError(status: number, code: string, message: string): void;

    formatError(status: number, code: string, message: string, errors: any): void;
  }
}
