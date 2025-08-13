// Simple icon components to replace lucide-react
import { Loader2, Send, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { useAuth0 } from "../hooks/useAuth0";
import { FederatedConnectionPopup } from "./FederatedConnectionPopup";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface Auth0InterruptionUI {
  behavior: string;
  connection: string;
  scopes: string[];
  requiredScopes: string[];
  code: string;
  toolCall: { id: string };
  resume: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const InterruptionPrefix = "AUTH0_AI_INTERRUPTION:";
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export function Chat() {
  const { getToken } = useAuth0();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolInterrupt, setToolInterrupt] =
    useState<Auth0InterruptionUI | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const performChatRequest = async (messagesToSend: ChatMessage[]) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const token = await getToken();
      const response = await fetch(`${SERVER_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: messagesToSend.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      // Create assistant message placeholder
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              setIsLoading(false);
              return;
            }

            // Check for Auth0 AI interruption
            if (data.startsWith(InterruptionPrefix)) {
              const interruptData = data.slice(InterruptionPrefix.length);
              try {
                const parsedInterrupt = JSON.parse(interruptData);

                // Set tool interrupt state to show the popup
                setToolInterrupt({
                  ...parsedInterrupt,
                  resume: async () => {
                    setToolInterrupt(null);
                    setError(null);

                    // After federated connection is established, we need to retry the request with fresh tokens
                    console.log(
                      "Resuming after federated connection - retrying with fresh tokens"
                    );

                    // Remove incomplete assistant message
                    setMessages((prev) =>
                      prev.filter(
                        (msg) => msg.role !== "assistant" || msg.content !== ""
                      )
                    );

                    // Retry the chat request with the same messages but fresh token
                    await performChatRequest(messagesToSend);
                  },
                });

                setIsLoading(false);
                return;
              } catch (parseError) {
                console.error("Error parsing interrupt data:", parseError);
              }
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "content" && parsed.content) {
                assistantContent = parsed.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              } else if (parsed.type === "error") {
                throw new Error(parsed.error || "Unknown error occurred");
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Request aborted");
        return;
      }

      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");

      // Remove the incomplete assistant message
      setMessages((prev) =>
        prev.filter((msg) => msg.role !== "assistant" || msg.content !== "")
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Use the shared chat request function
    await performChatRequest([...messages, userMessage]);
  };

  const clearMessages = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setToolInterrupt(null);
    setMessages([]);
    setError(null);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          Calendar Assistant (LangGraph)
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
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Ask me about your calendar events!</p>
              <p className="text-xs mt-1">
                Try: "What meetings do I have today?" or "Show me my calendars"
              </p>
            </div>
          ) : (
            messages.map((message) => (
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
        {error && !error.startsWith?.(InterruptionPrefix) && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
            Error: {error}
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
            onChange={(e) => setInput(e.target.value)}
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

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
