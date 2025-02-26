"use client";

import { ChatRequestOptions, Message } from "ai";
import cx from "classnames";
import equal from "fast-deep-equal";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useState } from "react";

import { EnsureAPIAccessPopup } from "@/components/auth0-ai/FederatedConnections/popup";
import { cn } from "@/lib/utils";
import { Auth0InterruptionUI } from "@auth0/ai-vercel/react";

import { DocumentToolCall, DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { GoogleCalendarIcon, PencilEditIcon, SparklesIcon } from "./icons";
import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Weather } from "./weather";

import type { Vote } from "@/lib/db/schema";

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
  toolInterrupt,
}: {
  chatId: string;
  message: Message;
  vote: Vote | undefined;
  isLoading: boolean;
  toolInterrupt: Auth0InterruptionUI | null;
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[])
  ) => void;
  reload: (
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  return (
    <AnimatePresence>
      <motion.div
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            {
              "w-full": mode === "edit",
              "group-data-[role=user]/message:w-fit": mode !== "edit",
            }
          )}
        >
          {message.role === "assistant" &&
            (!(
              !message.content &&
              message.parts &&
              message.parts.length > 0 &&
              message.parts.some(
                (mp) =>
                  mp.type === "tool-invocation" &&
                  mp.toolInvocation.state === "result"
              )
            ) ||
              process.env.NEXT_PUBLIC_DEBUG_TOOLS_RESULTS) && (
              <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
                <div className="translate-y-px">
                  <SparklesIcon size={14} />
                </div>
              </div>
            )}

          <div className="flex flex-col gap-4 w-full">
            {message.experimental_attachments && (
              <div className="flex flex-row justify-end gap-2">
                {message.experimental_attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            {message.reasoning && (
              <MessageReasoning
                isLoading={isLoading}
                reasoning={message.reasoning}
              />
            )}

            {(message.content || message.reasoning) && mode === "view" && (
              <div className="flex flex-row gap-2 items-start">
                {message.role === "user" && !isReadonly && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                        onClick={() => {
                          setMode("edit");
                        }}
                      >
                        <PencilEditIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit message</TooltipContent>
                  </Tooltip>
                )}

                <div
                  className={cn("flex flex-col gap-4", {
                    "bg-primary text-primary-foreground px-3 py-2 rounded-xl":
                      message.role === "user",
                  })}
                >
                  <Markdown>{message.content as string}</Markdown>

                  {process.env.NEXT_PUBLIC_DEBUG_TOOLS_RESULTS
                    ? JSON.stringify(message.annotations)
                    : ""}
                </div>
              </div>
            )}

            {message.content && mode === "edit" && (
              <div className="flex flex-row gap-2 items-start">
                <div className="size-8" />

                <MessageEditor
                  key={message.id}
                  message={message}
                  setMode={setMode}
                  setMessages={setMessages}
                  reload={reload}
                />
              </div>
            )}

            {message.parts && message.parts.length > 0 && (
              <div className="flex flex-col gap-4">
                {message.parts
                  .filter((p) => p.type === "tool-invocation")
                  .map((part) => {
                    const { toolInvocation } = part;
                    const { toolName, toolCallId, state, args } =
                      toolInvocation;
                    if (
                      state === "call" &&
                      toolInterrupt &&
                      toolInterrupt.toolCallId === toolCallId
                      // && FEDERATED_CONNECTION_INTERRUPTION
                    ) {
                      return (
                        <EnsureAPIAccessPopup
                          key={toolCallId}
                          addToolResult={toolInterrupt.addToolResult}
                          connection={toolInterrupt.connection}
                          scopes={toolInterrupt.requiredScopes}
                          connectWidget={{
                            icon: (
                              <div className="bg-gray-200 p-3 rounded-lg flex-wrap">
                                <GoogleCalendarIcon />
                              </div>
                            ),
                            title: "Manage your calendar",
                            description:
                              "This showcases the Google Calendar API integration...",
                            action: { label: "Check" },
                          }}
                        />
                      );
                    }
                    if (toolInvocation.state === "result") {
                      const { result } = toolInvocation;

                      return (
                        <div key={toolCallId}>
                          {toolName === "getWeather" ? (
                            <Weather weatherAtLocation={result} />
                          ) : toolName === "createDocument" ? (
                            <DocumentPreview
                              isReadonly={isReadonly}
                              result={result}
                            />
                          ) : toolName === "updateDocument" ? (
                            <DocumentToolResult
                              type="update"
                              result={result}
                              isReadonly={isReadonly}
                            />
                          ) : toolName === "requestSuggestions" ? (
                            <DocumentToolResult
                              type="request-suggestions"
                              result={result}
                              isReadonly={isReadonly}
                            />
                          ) : process.env.NEXT_PUBLIC_DEBUG_TOOLS_RESULTS ? (
                            <pre>{JSON.stringify(result, null, 2)}</pre>
                          ) : (
                            <></>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={toolCallId}
                        className={cx({
                          skeleton: ["getWeather"].includes(toolName),
                        })}
                      >
                        {toolName === "getWeather" ? (
                          <Weather />
                        ) : toolName === "createDocument" ? (
                          <DocumentPreview
                            isReadonly={isReadonly}
                            args={args}
                          />
                        ) : toolName === "updateDocument" ? (
                          <DocumentToolCall
                            type="update"
                            args={args}
                            isReadonly={isReadonly}
                          />
                        ) : toolName === "requestSuggestions" ? (
                          <DocumentToolCall
                            type="request-suggestions"
                            args={args}
                            isReadonly={isReadonly}
                          />
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            )}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.toolInterrupt !== nextProps.toolInterrupt) return false;
    if (prevProps.message.reasoning !== nextProps.message.reasoning)
      return false;
    if (prevProps.message.content !== nextProps.message.content) return false;
    if (
      !equal(
        prevProps.message.toolInvocations,
        nextProps.message.toolInvocations
      )
    )
      return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;

    return true;
  }
);

export const ThinkingMessage = () => {
  return LoadingMessage("Thinking...");
};

export const ProcessingMessage = () => {
  return LoadingMessage("Processing...");
};

export const LoadingMessage = (message: string) => {
  const role = "assistant";

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          "flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl",
          {
            "group-data-[role=user]/message:bg-muted": true,
          }
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            {message}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
