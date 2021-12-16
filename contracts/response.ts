declare module "@ioc:Adonis/Core/Response" {
  interface ResponseContract {
    format(status: number, data: any): void;
  }
}
