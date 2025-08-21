import { Loader2, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Message, toUIMessage } from "shared";

import { FederatedConnectionInterrupt } from "@auth0/ai/interrupts";
import { HumanMessage } from "@langchain/core/messages";
import { useStream } from "@langchain/langgraph-sdk/react";

import { useAuth0 } from "../hooks/useAuth0";
import { FederatedConnectionPopup } from "./FederatedConnectionPopup";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
const ASSISTANT_ID = "default";

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

export function Chat() {
  const { getToken } = useAuth0();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [currentInterrupt, setCurrentInterrupt] = useState<any>(null);
  const [inputRef] = useFocus();

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const authToken = await getToken();
        setToken(authToken);
      } catch (error) {
        console.error("Error getting token:", error);
        setError("Failed to authenticate");
      }
    };
    fetchToken();
  }, [getToken]);

  // Memoize headers to avoid unnecessary re-renders
  const defaultHeaders = useMemo(() => {
    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined;

    return headers;
  }, [token]);

  const thread = useStream({
    apiUrl: `${SERVER_URL}/api/langgraph`,
    assistantId: ASSISTANT_ID,
    threadId,
    onThreadId: setThreadId,
    onError: (err) => {
      console.error("Thread error:", err);
    },
    onUpdateEvent: (data) => {
      if (data && typeof data === "object" && "__interrupt__" in data) {
        console.log("🚨 INTERRUPT FOUND IN UPDATE EVENT:", data.__interrupt__);
        setCurrentInterrupt(data.__interrupt__);
      }
    },
    defaultHeaders,
  });

  // Resume function after authorization is complete
  const resumeAfterAuth = useCallback(async () => {
    console.log("🔄 Resuming after auth - clearing interrupt");
    setCurrentInterrupt(null);
    setError(null);

    try {
      // Get the fresh token after authorization
      const freshToken = await getToken();
      setToken(freshToken);

      // Resume the thread
      if (thread.interrupt) {
        await thread.submit(null);
      }
    } catch (error) {
      console.error("Error getting fresh token after authorization:", error);
      setError("Failed to get fresh token after authorization");
    }
  }, [getToken, thread]);

  const clearMessages = useCallback(() => {
    setError(null);
    setThreadId(null);
    setCurrentInterrupt(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || thread.isLoading) return;

      const messageContent = input.trim();
      setInput("");

      try {
        const humanMessage = new HumanMessage(messageContent);

        thread.submit({
          messages: [humanMessage],
        });
      } catch (err) {
        console.error("Submit error:", err);
      }
    },
    [input, thread]
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          Calendar Assistant (LangGraph)
        </CardTitle>
        {threadId && (
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
      <CardContent>
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
            Error: {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Messages */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {thread.messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">Ask me about your calendar events!</p>
                <p className="text-xs mt-1">
                  Try: "What meetings do I have today?" or "Show me my
                  calendars"
                </p>
              </div>
            ) : (
              thread.messages
                .map(toUIMessage)
                .filter((m) => m !== null)
                .map((message, index) => (
                  <MessageBubble
                    key={message.id || `msg-${index}`}
                    message={message}
                  />
                ))
            )}
            {thread.isLoading && (
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

          {/* Auth0 Interrupt Popup - Using currentInterrupt from stream updates */}
          {currentInterrupt &&
          FederatedConnectionInterrupt.isInterrupt(currentInterrupt.value) ? (
            <FederatedConnectionPopup
              interrupt={currentInterrupt.value}
              onAuthComplete={resumeAfterAuth}
            />
          ) : null}

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your calendar..."
              disabled={thread.isLoading}
              className="flex-1"
              ref={inputRef}
              autoFocus
            />
            <Button
              className="h-10"
              type="submit"
              disabled={thread.isLoading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === "human";

  // Skip messages without content
  if (
    !message.content ||
    typeof message.content !== "string" ||
    message.content.trim() === ""
  ) {
    return null;
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-lg px-3 py-2 max-w-[80%] ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-100"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
