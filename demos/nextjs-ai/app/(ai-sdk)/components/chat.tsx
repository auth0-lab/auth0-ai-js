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
        api: "/api/ai-sdk",
        experimental_throttle: 100,
        sendExtraMessageFields: true,
        generateId,
        onError: handler((error) => console.error("Chat error:", error)),
      })
    );

  // 1. {FederatedConnectionInterrupt.isInterrupt(toolInterrupt) && ()}
  // 2. EnsureAPIAccessPopup params (authParams, onFinish?, connectWidget, classname)
  //    a. interrupt={toolInterrupt}
  //    b. Support for cancel
  // 3. `withInterruptions` in `route`

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map((message) => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === "user" ? "User: " : "AI: "}
          {message.content}
        </div>
      ))}

      {FederatedConnectionInterrupt.isInterrupt(toolInterrupt) && (
        <EnsureAPIAccessPopup
          // key={toolInterrupt.tool.id}
          interrupt={toolInterrupt}
          // onFinish={toolInterrupt.resume}
          // connection={toolInterrupt.connection}
          // scopes={toolInterrupt.requiredScopes}
          connectWidget={{
            title: `Requested by: "${toolInterrupt.tool.name}"`,
            description: "Description...",
            action: { label: "Check" },
          }}
        />
      )}

      <form onSubmit={handleSubmit}>
        <input
          disabled={toolInterrupt !== null}
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
      </form>
    </div>
  );
}
