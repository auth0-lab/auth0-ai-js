import { ModelMessage, AISDKError } from "ai";

import { Auth0Interrupt } from "@auth0/ai/interrupts";

export const toolCallFromError = (error: AISDKError & { toolCallId: string }): any => {
  return {
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolName: error.name,
        toolCallId: error.toolCallId,
        input: error.message,
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
  currentMessages: ModelMessage[],
  error: AISDKError & { toolCallId: string }
): ModelMessage[] => {
  if (!(error instanceof AISDKError)) {
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
