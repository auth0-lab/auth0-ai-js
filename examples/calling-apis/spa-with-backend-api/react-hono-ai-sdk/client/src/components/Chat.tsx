import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  TextUIPart,
  UIMessage,
} from "ai";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useState } from "react";

import { useChat } from "@ai-sdk/react";
import { useInterruptions } from "@auth0/ai-vercel/react";
import { FederatedConnectionInterrupt } from "@auth0/ai/interrupts";
import { HITL_APPROVAL } from "@auth0/auth0-ai-js-examples-react-hono-ai-sdk-shared";

import { useAuth0 } from "../hooks/useAuth0";
import { FederatedConnectionPopup } from "./FederatedConnectionPopup";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export function Chat() {
  const { getToken } = useAuth0();
  const [input, setInput] = useState<string>("");
  const chatHelpers = useInterruptions((errorHandler) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useChat({
      transport: new DefaultChatTransport({
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
      }),
      onError: errorHandler((error) => {
        console.error("Chat error:", error);
      }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    })
  );

  const { messages, sendMessage, status, error, setMessages, toolInterrupt } =
    chatHelpers;

  const clearMessages = () => {
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
        {/* Approval banner for callProtectedApi */}
        <ApprovalPrompt
          messages={messages}
          addToolResult={chatHelpers.addToolResult}
          sendMessage={() => sendMessage()}
        />
        {/* Messages */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Ask me about your calendar events!</p>
              <p className="text-xs mt-1">
                Try: "What meetings do I have today?" or "Show me my upcoming
                events"
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          {status === "streaming" && (
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
        {error && !FederatedConnectionInterrupt.isInterrupt(toolInterrupt) && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
            Error: {error.message}
          </div>
        )}

        {/* Step-Up Auth Interrupt Handling */}
        {FederatedConnectionInterrupt.isInterrupt(toolInterrupt) && (
          <FederatedConnectionPopup interrupt={toolInterrupt} />
        )}

        {/* Input form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage({ text: input });
            setInput("");
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your calendar..."
            disabled={status === "streaming"}
            className="flex-1"
          />
          <Button
            className="h-10"
            type="submit"
            disabled={status === "streaming" || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  type ToolPartWithOutput = {
    type: `tool-${string}`;
    state: string;
    output?: unknown;
    toolName?: string;
  } & Record<string, unknown>;

  const combinedContent = (message.parts || [])
    .map((part) => {
      if (part.type === "text") return (part as TextUIPart).text;
      if (isToolUIPart(part)) {
        const toolName = getToolName(part);
        const p = part as ToolPartWithOutput;
        if (
          toolName === "callProtectedApi" &&
          p.state === "output-available" &&
          typeof p.output === "string"
        ) {
          return p.output;
        }
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-lg px-3 py-2 max-w-[80%] ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{combinedContent}</p>
      </div>
    </div>
  );
}

function ApprovalPrompt({
  messages,
  addToolResult,
  sendMessage,
}: {
  messages: UIMessage[];
  addToolResult: (payload: {
    tool: string;
    toolCallId: string;
    output: string;
  }) => Promise<unknown> | void;
  sendMessage: () => Promise<unknown> | void;
}) {
  // Minimal shape we rely on for a pending tool call
  type PendingPart = {
    type: `tool-${string}`;
    toolCallId: string;
    state: "input-available";
    input?: Record<string, unknown>;
  };
  let pending: PendingPart | null = null;
  outer: for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    for (const part of m.parts || []) {
      if (isToolUIPart(part)) {
        const toolName = getToolName(part);
        if (
          toolName === "callProtectedApi" &&
          part.state === "input-available"
        ) {
          pending = part as unknown as PendingPart;
          break outer;
        }
      }
    }
  }
  if (!pending) return null;
  const reason =
    typeof pending.input === "object" &&
    pending.input &&
    "reason" in pending.input
      ? String((pending.input as { reason: unknown }).reason)
      : "(none provided)";
  const toolCallId = pending.toolCallId;

  return (
    <div className="border border-amber-400 bg-amber-50 text-amber-900 rounded-md p-3 text-sm flex flex-col gap-2">
      <div className="font-medium">Protected API access requested</div>
      <div>The assistant wants to access protected data.</div>
      <div className="text-xs">Reason: {reason}</div>
      <div className="flex gap-2 mt-1">
        <Button
          size="sm"
          variant="success"
          onClick={async () => {
            await addToolResult({
              tool: "callProtectedApi",
              toolCallId,
              output: HITL_APPROVAL.YES,
            });
            sendMessage();
          }}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={async () => {
            await addToolResult({
              tool: "callProtectedApi",
              toolCallId,
              output: HITL_APPROVAL.NO,
            });
            sendMessage();
          }}
        >
          Deny
        </Button>
      </div>
    </div>
  );
}
