/**
 * Base class for all errors thrown by the Auth0 AI library.
 */
export abstract class Interruption extends Error {
  code: string;
  toolCallId: string;
  constructor(message: string, toolCallId: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.toolCallId = toolCallId;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Interruption);
    }
  }
}
