import type { GraphInterrupt } from "@langchain/langgraph";

// Import official Auth0 AI interrupt types
import type { FederatedConnectionInterrupt } from "@auth0/ai/interrupts";

export interface ApiResponse {
  message: string;
  success: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
}

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
}

// Auth0 Interrupt types for better TypeScript support
// This interface extends FederatedConnectionInterrupt with client-side specific functionality
export interface Auth0InterruptionUI extends FederatedConnectionInterrupt {
  // Client-side resume function for handling interrupt resolution
  resume: (result?: unknown) => void;
}

// Type for server-side serialized interrupt data
// This represents the JSON-serialized FederatedConnectionInterrupt
export type Auth0InterruptData = ReturnType<
  FederatedConnectionInterrupt["toJSON"]
>;

// SSE Data types
export interface SSEContentData {
  type: "content";
  content: string;
  role: "assistant";
}

export interface SSEErrorData {
  type: "error";
  error: string;
}

export type SSEData = SSEContentData | SSEErrorData;

// Request/Response types
export interface ChatRequest {
  messages: readonly Pick<ChatMessage, "role" | "content">[];
}

// Extend official LangGraph types for streaming data
export interface StreamChunk {
  // Official LangGraph interrupt format - directly using GraphInterrupt[]
  __interrupt__?: GraphInterrupt[];
  // Messages array in "values" mode
  messages?: readonly unknown[];
  // callLLM node update in "updates" mode
  callLLM?: {
    messages: readonly unknown[];
  };
  // Any other properties in "updates" mode (e.g., node updates)
  [key: string]: unknown;
}

// Constants
export const INTERRUPTION_PREFIX = "AUTH0_AI_INTERRUPTION:" as const;

// Type guards for better runtime type safety
export const isSSEData = (data: unknown): data is SSEData => {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    ((data as SSEData).type === "content" || (data as SSEData).type === "error")
  );
};

export const isSSEContentData = (data: SSEData): data is SSEContentData => {
  return data.type === "content" && "content" in data && "role" in data;
};

export const isSSEErrorData = (data: SSEData): data is SSEErrorData => {
  return data.type === "error" && "error" in data;
};

export const isChatRequest = (data: unknown): data is ChatRequest => {
  return (
    typeof data === "object" &&
    data !== null &&
    "messages" in data &&
    Array.isArray((data as ChatRequest).messages) &&
    (data as ChatRequest).messages.every(
      (msg) =>
        typeof msg === "object" &&
        msg !== null &&
        "role" in msg &&
        "content" in msg &&
        typeof msg.role === "string" &&
        typeof msg.content === "string"
    )
  );
};
