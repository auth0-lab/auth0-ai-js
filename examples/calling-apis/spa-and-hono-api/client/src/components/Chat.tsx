import { Loader2, Send, Trash2 } from "lucide-react";
import { useState } from "react";

import { useChat } from "@ai-sdk/react";

import { useAuth0 } from "../hooks/useAuth0";
import { FederatedConnectionPopup } from "./FederatedConnectionPopup";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

import type { Auth0InterruptionUI } from "@auth0/ai-vercel/react";

import type { Message } from "ai";

const InterruptionPrefix = "AUTH0_AI_INTERRUPTION:";
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export function Chat() {
  const { getToken } = useAuth0();
  const [toolInterrupt, setToolInterrupt] =
    useState<Auth0InterruptionUI | null>(null);

  const chatHelpers = useChat({
    api: `${SERVER_URL}/chat`,
    fetch: (async (url: string | URL | Request, init?: RequestInit) => {
      const token = await getToken();
      return fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    }) as typeof fetch,
    onError: (error) => {
      if (!error.message.startsWith(InterruptionPrefix)) {
        console.error("Chat error:", error);
        return;
      }

      console.log("Processing interrupt...");
      const parsedError = JSON.parse(
        error.message.replace(InterruptionPrefix, "")
      );

      setToolInterrupt({
        ...parsedError,
        resume: async () => {
          setToolInterrupt(null);

          // After federated connection is established, we need to retry with a fresh token
          console.log("Resuming after federated connection - reloading chat");

          // Use reload() to retry the conversation with the new token
          reload();
        },
      });
    },
    onFinish: (message, options) => {
      console.log("onFinish called with:", message, options);

      // Check if the message content contains an interrupt
      if (message.content.startsWith(InterruptionPrefix)) {
        const parsedError = JSON.parse(
          message.content.replace(InterruptionPrefix, "")
        );

        setToolInterrupt({
          ...parsedError,
          resume: () => {
            setToolInterrupt(null);
            // After federated connection, reload to get fresh tokens
            console.log("Resuming from onFinish interrupt - reloading chat");
            reload();
          },
        });
      }
    },
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
    reload,
  } = chatHelpers;

  // Filter out interrupted tool calls from messages and check for interrupts
  let displayMessages = messages;

  // Check if any message contains an interrupt
  messages.forEach((msg) => {
    if (
      msg.content &&
      typeof msg.content === "string" &&
      msg.content.startsWith(InterruptionPrefix)
    ) {
      const parsedError = JSON.parse(
        msg.content.replace(InterruptionPrefix, "")
      );

      if (!toolInterrupt) {
        // Only set if not already set
        const { id } = parsedError.toolCall;
        setToolInterrupt({
          ...parsedError,
          resume: (result?: unknown) => {
            setToolInterrupt(null);
            if (parsedError?.behavior === "reload") {
              chatHelpers.reload();
            } else {
              chatHelpers.addToolResult({
                toolCallId: id,
                result: {
                  continueInterruption: true,
                  ...((result as Record<string, unknown>) || {}),
                },
              });
            }
          },
        });
      }
    }
  });

  if (toolInterrupt) {
    displayMessages = messages.map((message) => ({
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

  const clearMessages = () => {
    // Clear any active interrupts first
    setToolInterrupt(null);
    // Use setMessages to properly clear the chat history instead of reload()
    setMessages([]);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          Calendar Assistant
        </CardTitle>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearMessages}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {displayMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Ask me about your calendar events!</p>
              <p className="text-xs mt-1">
                Try: "What meetings do I have today?" or "Show me my upcoming
                events"
              </p>
            </div>
          ) : (
            displayMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 max-w-[80%] flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Thinking...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error message - hide if it's an Auth0 interrupt (we show the popup instead) */}
        {error && !error.message.startsWith(InterruptionPrefix) && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
            Error: {error.message}
          </div>
        )}

        {/* Federated Connection Interrupt Handling */}
        {toolInterrupt && (
          <FederatedConnectionPopup interrupt={toolInterrupt} />
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about your calendar..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            className="h-10"
            type="submit"
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-lg px-3 py-2 max-w-[80%] ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
