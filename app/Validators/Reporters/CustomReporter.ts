import {
  ErrorReporterContract,
  MessagesBagContract,
  VanillaErrorNode,
} from "@ioc:Adonis/Core/Validator";
import ValidationException from "App/Exceptions/ValidationException";

/**
 * The vanilla error reporter to stores an array of messages in
 * reference to a given field. Tailored for displaying messages
 * next to a form field.
 */
export class CustomReporter implements ErrorReporterContract<VanillaErrorNode> {
  /**
   * Collected errors
   */
  private errors: VanillaErrorNode = {};

  /**
   * A boolean to know if an error has been reported or
   * not
   */
  public hasErrors = false;

  constructor(private messages: MessagesBagContract, private bail: boolean) {}

  /**
   * Report a new error
   */
  public report(
    pointer: string,
    rule: string,
    message: string,
    arrayExpressionPointer?: string,
    args?: any
  ) {
    this.hasErrors = true;

    const err = pointer.split(".").reduce((errors: any, p) => {
      errors[p] = {};
      return errors[p];
    }, this.errors);

    err[rule] = this.messages.get(
      pointer,
      rule,
      message,
      arrayExpressionPointer,
      args
    );

    /**
     * Raise exception right away when `bail=true`.
     */
    if (this.bail) {
      throw this.toError();
    }
  }

  /**
   * Returns an instance of [[ValidationException]]
   */
  public toError() {
    return new ValidationException(this.toJSON());
  }

  /**
   * Return errors
   */
  public toJSON() {
    return this.errors;
  }
}
