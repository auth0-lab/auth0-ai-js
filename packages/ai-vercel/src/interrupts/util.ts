import { CoreMessage, ToolExecutionError } from "ai";

import { Auth0Interrupt } from "@auth0/ai/interrupts";

export const toolCallFromError = (error: ToolExecutionError): CoreMessage => {
  return {
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolCallId: error.toolCallId,
        toolName: error.toolName,
        args: error.toolArgs,
      },
    ],
  };
};

/**
 *
 * Verify if the error is a tool execution error and append the tool call to the collection of messages.
 *
 * @param currentMessages - The current messages.
 * @param error - The error to verify.
 * @returns - The messages with the tool call appended or the current messages if the error is not a tool execution error.
 */
export const appendToolCall = (
  currentMessages: CoreMessage[],
  error: ToolExecutionError
): CoreMessage[] => {
  if (!(error instanceof ToolExecutionError)) {
    return currentMessages;
  }

  if (!(error.cause instanceof Auth0Interrupt)) {
    return currentMessages;
  }

  const lastMessage = currentMessages[currentMessages.length - 1];
  const content = lastMessage.content || [];
  const toolCall = Array.isArray(content)
    ? content.find(
        (c) => c.type === "tool-call" && c.toolCallId === error.toolCallId
      )
    : undefined;
  if (toolCall) {
    return currentMessages;
  }

  return [...currentMessages, toolCallFromError(error)];
};
