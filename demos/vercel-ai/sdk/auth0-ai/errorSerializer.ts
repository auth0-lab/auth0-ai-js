import { ToolExecutionError } from "ai";
import { Auth0AIError } from "./ErrorTypes/Auth0AIError";

export type errorHandler = (error: unknown) => string;
/**
 *
 * Serialize an error to string required by VercelAI.
 *
 * @param errHandler
 * @returns
 */
export const errorSerializer = (errHandler?: errorHandler): errorHandler => {
  return (error: unknown) => {
    let handledError: Auth0AIError | undefined = undefined;
    if (error instanceof Auth0AIError) {
      handledError = error;
    } else if (error && error instanceof ToolExecutionError && error.cause instanceof Auth0AIError) {
      handledError = error.cause;
    }

    if (typeof handledError !== 'undefined') {
      const result = `AUTH0_AI_ERROR:${JSON.stringify(handledError)}`;
      return result;
    } else if (errHandler) {
      return errHandler(error);
    } else {
      return 'An error occurred.';
    }
  };
};
