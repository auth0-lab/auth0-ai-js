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
  bahavior: string; // "resume" | "reload";

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

          if (parsedError?.behavior === "reload") {
            regenerate();
          } else {
            addToolResult({
              tool: parsedError.toolName,
              toolCallId: id,
              output: { continueInterruption: true, ...result },
            });
          }
        },
      });
    };
  };

  const { addToolResult, regenerate, ...chat } = useChatCreator(errorHandler);

  let messages = chat.messages;
  if (toolInterrupt) {
    messages = messages.map((message) => ({
      ...message,
      parts: message.parts?.map((part) =>
        part.type === "tool-invocation" &&
        part.toolCallId === toolInterrupt.toolCallId
          ? {
            ...part,
            state: "output-available",
            errorText: undefined,
              output: {
                ...(part?.output || {}),
                state: "output-available",
              },
            }
          : part
      ),
    }));
  }

  return {
    ...chat,
    messages,
    regenerate,
    addToolResult,
    toolInterrupt,
  };
};
