"use client";

import { Attachment, Message } from "ai";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

import { ChatHeader } from "@/components/chat-header";
import { useBlockSelector } from "@/hooks/use-block";
import { fetcher, generateUUID } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { useInterruptions } from "@auth0/ai-vercel/react";

import { Block } from "./block";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { VisibilityType } from "./visibility-selector";

import type { Vote } from "@/lib/db/schema";
export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    toolInterrupt,
  } = useInterruptions((handler) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useChat({
      id,
      body: { id, selectedChatModel: selectedChatModel },
      initialMessages,
      experimental_throttle: 100,
      sendExtraMessageFields: true,
      generateId: generateUUID,
      onFinish: () => {
        mutate("/api/history");
      },
      onError: handler((error) => {
        toast.error("An error occured, please try again!");
      }),
    })
  );

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isBlockVisible = useBlockSelector((state) => state.isVisible);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        <Messages
          chatId={id}
          isLoading={status !== "ready"}
          votes={votes}
          messages={messages}
          toolInterrupt={toolInterrupt}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isBlockVisible={isBlockVisible}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={status !== "ready"}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
            />
          )}
        </form>
      </div>

      <Block
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isLoading={status !== "ready"}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}
