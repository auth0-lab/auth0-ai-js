import { useState } from "react";

import { useChat } from "@ai-sdk/react";

import { InterruptionPrefix } from "#interrupts";

type UseChatReturnType = ReturnType<typeof useChat>;
type UseChatWithInterruptionsReturnType = ReturnType<typeof useChat> & {
  toolInterrupt: Auth0InterruptionUI | null;
};

type ErrorHandler = (
  userErrorHandler: (error: Error) => void
) => (error: Error) => void;

export type Auth0InterruptionUI = {
  name: string;
  code: string;

  tool: {
    id: string;
    name: string;
    args: any;
  };

  resume: () => void;

  [key: string]: any;
};

export const useInterruptions = (
  useChatCreator: (errorHandler: ErrorHandler) => UseChatReturnType
): UseChatWithInterruptionsReturnType => {
  const [toolInterrupt, setToolInterrupt] =
    useState<Auth0InterruptionUI | null>(null);

  const errorHandler: ErrorHandler = (
    userErrorHandler?: (error: Error) => void
  ) => {
    return (error: Error) => {
      if (!error.message.startsWith(InterruptionPrefix)) {
        if (userErrorHandler) {
          userErrorHandler(error);
        }
        return;
      }
      const parsedError = JSON.parse(
        error.message.replace(InterruptionPrefix, "")
      );
      const { id } = parsedError.toolCall;

      setToolInterrupt({
        ...parsedError,
        resume: (result: any) => {
          setToolInterrupt(null);
          addToolResult({
            toolCallId: id,
            result: { continueInterruption: true, ...result },
          });
        },
      });
    };
  };

  const { addToolResult, ...chat } = useChatCreator(errorHandler);

  let messages = chat.messages;
  if (toolInterrupt) {
    messages = messages.map((message) => ({
      ...message,
      parts: message.parts?.map((part) =>
        part.type === "tool-invocation" &&
        part.toolInvocation.toolCallId === toolInterrupt.toolCallId
          ? {
              ...part,
              toolInvocation: {
                ...part.toolInvocation,
                state: "call",
              },
            }
          : part
      ),
    }));
  }

  return {
    ...chat,
    messages,
    addToolResult,
    toolInterrupt,
  };
};
