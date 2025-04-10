/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import { useQueryState } from "nuqs";
import { FormEventHandler, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

import { FederatedConnectionInterrupt } from "@auth0/ai/interrupts";

import { EnsureAPIAccessPopup } from "../../../components/auth0-ai/FederatedConnections/popup";

const useFocus = () => {
  const htmlElRef = useRef<HTMLInputElement>(null);
  const setFocus = () => {
    if (!htmlElRef.current) {
      return;
    }
    htmlElRef.current.focus();
  };
  return [htmlElRef, setFocus] as const;
};

export default function Chat() {
  const [threadId, setThreadId] = useQueryState("threadId");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<
    {
      role: "user" | "model";
      content: [{ text?: string; metadata?: { interrupt?: any } }];
    }[]
  >([]);

  useEffect(() => {
    if (!threadId) {
      setThreadId(self.crypto.randomUUID());
    }
  }, [threadId, setThreadId]);

  useEffect(() => {
    if (!threadId) {
      return;
    }

    setIsLoading(true);

    (async () => {
      const messagesResponse = await fetch(`/api/genkit/chat/${threadId}`, {
        method: "GET",
        credentials: "include",
      });
      if (!messagesResponse.ok) {
        setMessages([]);
      } else {
        setMessages(await messagesResponse.json());
      }
      setIsLoading(false);
    })();
  }, [threadId]);

  const [inputRef, setInputFocus] = useFocus();
  useEffect(() => {
    if (isLoading) {
      return;
    }
    setInputFocus();
  }, [isLoading, setInputFocus]);

  const submit = async ({
    message,
    interruptedToolRequest,
  }: {
    message?: string;
    interruptedToolRequest?: any;
  }) => {
    setIsLoading(true);
    const timezone = {
      region: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: new Date().getTimezoneOffset(),
    };
    const response = await fetch(`/api/genkit/chat/${threadId}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, interruptedToolRequest, timezone }),
    });
    if (!response.ok) {
      console.error("Error sending message");
    } else {
      const { messages: messagesResponse } = await response.json();
      setMessages(messagesResponse);
    }
    setIsLoading(false);
  };

  // //When the user submits a message, add it to the list of messages and resume the conversation.
  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setMessages((messages) => [
      ...messages,
      { role: "user", content: [{ text: input }] },
    ]);
    submit({ message: input });
    setInput("");
  };

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages
        .filter(
          (m) =>
            ["model", "user", "tool"].includes(m.role) &&
            m.content?.length > 0 &&
            (m.content[0].text || m.content[0].metadata?.interrupt)
        )
        .map((message, index) => (
          <div key={index} className="whitespace-pre-wrap">
            <Markdown>
              {(message.role === "user" ? "User: " : "AI: ") +
                (message.content[0].text || "")}
            </Markdown>
            {!isLoading &&
            message.content[0].metadata?.interrupt &&
            FederatedConnectionInterrupt.isInterrupt(
              message.content[0].metadata?.interrupt
            )
              ? (() => {
                  const interrupt: any = message.content[0].metadata?.interrupt;
                  return (
                    <div className="whitespace-pre-wrap">
                      <EnsureAPIAccessPopup
                        onFinish={() =>
                          submit({ interruptedToolRequest: message.content[0] })
                        }
                        connection={interrupt.connection}
                        scopes={interrupt.requiredScopes}
                        connectWidget={{
                          title: `Requested by: "${interrupt.toolCall.toolName}"`,
                          description: "Description...",
                          action: { label: "Check" },
                        }}
                      />
                    </div>
                  );
                })()
              : null}
          </div>
        ))}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          ref={inputRef}
          placeholder="Say something..."
          readOnly={isLoading}
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  );
}
