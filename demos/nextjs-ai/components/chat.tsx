"use client";

import cx from "classnames";

import { generateUUID } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { useInterruptions } from "@auth0/ai-vercel/react";
import { FederatedConnectionInterrupt } from "@auth0/ai/interrupts";

import { EnsureAPIAccessPopup } from "./auth0-ai/FederatedConnections/popup";
import { GoogleCalendarIcon } from "./icons";
import { Weather } from "./weather";

export default function Chat() {
  const { messages, handleSubmit, input, setInput, toolInterrupt } =
    useInterruptions((handler) =>
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useChat({
        experimental_throttle: 100,
        sendExtraMessageFields: true,
        generateId: generateUUID,
        onError: handler((error) => console.error("Chat error:", error)),
      })
    );

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map((message) => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === "user" ? "User: " : "AI: "}
          {message.content}

          {message.parts && message.parts.length > 0 && (
            <div className="flex flex-col gap-4">
              {message.parts
                .filter((p) => p.type === "tool-invocation")
                .map((part) => {
                  const { toolInvocation } = part;
                  const { toolName, toolCallId, state } = toolInvocation;
                  if (
                    state === "call" &&
                    FederatedConnectionInterrupt.isInterrupt(toolInterrupt)
                  ) {
                    return (
                      <EnsureAPIAccessPopup
                        key={toolCallId}
                        onFinish={toolInterrupt.resume}
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
                      {toolName === "getWeather" ? <Weather /> : null}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  );
}
