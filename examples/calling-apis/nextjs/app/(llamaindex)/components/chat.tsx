"use client";

import { generateId } from "ai";

import { EnsureAPIAccessPopup } from "@/components/auth0-ai/FederatedConnections/popup";
import { useChat } from "@ai-sdk/react";
import { useInterruptions } from "@auth0/ai-vercel/react";
import { FederatedConnectionInterrupt } from "@auth0/ai/interrupts";

export default function Chat() {
  const { messages, handleSubmit, input, setInput, toolInterrupt } =
    useInterruptions((handler) =>
      useChat({
        api: "/api/llamaindex",
        experimental_throttle: 100,
        sendExtraMessageFields: true,
        generateId,
        onError: handler((error) => console.error("Chat error:", error)),
      })
    );

  return (
    <div className="flex flex-col gap-4 w-full max-w-md py-12 sm:py-24 px-4 sm:px-0 mx-auto stretch">
      {messages.map((message) => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === "user" ? "User: " : "AI: "}
          {message.content}
          {message.parts && message.parts.length > 0 && (
            <div className="flex flex-col gap-4">
              {toolInterrupt?.toolCall.id.includes(message.id) &&
                FederatedConnectionInterrupt.isInterrupt(toolInterrupt) && (
                  <EnsureAPIAccessPopup
                    onFinish={toolInterrupt.resume}
                    interrupt={toolInterrupt}
                    connectWidget={{
                      title: `Requested by: "${toolInterrupt.toolCall.name}"`,
                      description: "Description...",
                      action: { label: "Check" },
                    }}
                  />
                )}
            </div>
          )}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed dark:bg-zinc-900 bg-white bottom-0 w-full max-w-sm sm:max-w-md p-3 mb-8 border border-zinc-300 dark:border-zinc-800 rounded-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
      </form>
    </div>
  );
}
