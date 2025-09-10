import { useState } from "react";

import { useChat } from "@ai-sdk/react";

import { InterruptionPrefix } from "#interrupts";

type UseChatReturnType = ReturnType<typeof useChat>;
export type UseChatWithInterruptionsReturnType = UseChatReturnType & {
  toolInterrupt: Auth0InterruptionUI | null;
};

export type ErrorHandler = (
  userErrorHandler: (error: Error) => void
) => (error: Error) => void;

export type ToolResultPayload = {
  tool: string;
  toolName: string;
  toolCallId: string;
  output: {
    continueInterruption: true;
    toolName: string;
    [k: string]: any;
  };
};

export type Auth0InterruptionUI = {
  name: string;
  code: string;
  bahavior: string; // "resume" | "reload";
  tool: { id: string; name: string; args: any };
  resume: () => void;
  [key: string]: any;
};

export function useInterruptions(
  useChatCreator: (errorHandler: ErrorHandler) => UseChatReturnType
): UseChatWithInterruptionsReturnType {
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
              // added for compatibility w/ SDK5
              tool: parsedError.toolCall?.name,
              // toolName left for compatibility w/ existing types
              toolName: parsedError.toolCall?.name,
              toolCallId: id,
              output: {
                continueInterruption: true,
                // toolName left for compatibility w/ existing types
                toolName: parsedError.toolCall?.name,
                ...result,
              },
            } as ToolResultPayload);
          }
        },
      });
    };
  };

  const { addToolResult, regenerate, ...chat } = useChatCreator(errorHandler);

  let messages = chat.messages;
  if (toolInterrupt) {
    messages = messages.map((message: any) => ({
      ...message,
      parts: message.parts?.map((part: any) => {
        if (
          part.type?.startsWith?.("tool-") &&
          "toolCallId" in part &&
          part.toolCallId === toolInterrupt.toolCall?.id
        ) {
          return {
            ...part,
            state: "output-available",
            errorText: undefined,
            output: { ...(part?.output || {}), state: "output-available" },
          };
        }
        return part;
      }),
    }));
  }

  return {
    ...chat,
    messages,
    toolInterrupt,
  } as UseChatWithInterruptionsReturnType;
}
