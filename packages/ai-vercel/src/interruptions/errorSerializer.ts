import { ToolExecutionError } from "ai";

import { Interruption } from "#interruptions";

export type errorHandler = (error: unknown) => string;

export const InterruptionPrefix = 'AUTH0_AI_INTERRUPTION:';

/**
 *
 * vercel-ai expects the error to be serialized as string in DataStreams.
 *
 * This function serializes the error to an string with the special prefix 'AUTH0_AI_INTERRUPTION:'.
 *
 * @param errHandler - error handler
 * @returns
 */
export const errorSerializer = (errHandler?: errorHandler): errorHandler => {
  return (error: unknown) => {
    console.log('errorSerializer called....');
    let handledError: Interruption | undefined = undefined;
    if (error instanceof Interruption) {
      handledError = error;
    } else if (error && error instanceof ToolExecutionError && error.cause instanceof Interruption) {
      handledError = error.cause;
    }

    if (typeof handledError !== 'undefined') {
      console.log('serializing error....');
      const result = `${InterruptionPrefix}${JSON.stringify(handledError)}`;
      return result;
    } else if (errHandler) {
      return errHandler(error);
    } else {
      return 'An error occurred.';
    }
  };
};
