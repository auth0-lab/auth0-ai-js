import type { GraphInterrupt } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

// Extend official LangGraph types for streaming data
export interface StreamChunk {
  // Official LangGraph interrupt format - directly using GraphInterrupt[]
  __interrupt__?: GraphInterrupt[];
  // Messages array in "values" mode
  messages?: BaseMessage[];
  // callLLM node update in "updates" mode
  callLLM?: {
    messages: readonly unknown[];
  };
  // Any other properties in "updates" mode (e.g., node updates)
  [key: string]: unknown;
}

// UI message type
export interface Message {
  id: string;
  type: "human" | "ai";
  content: string;
  timestamp: string;
  metadata?: {
    type?: MessageType;
    tool_call?: {
      id: string;
      name: string;
      args: Record<string, unknown>;
    };
    tool_response?: {
      id: string;
      output: unknown;
    };
    [key: string]: unknown;
  };
}

export const MESSAGE_TYPES = {
  TOOL_OUTPUT: "tool_output",
  USER_MESSAGE: "user_message",
  AGENT_RESPONSE: "agent_response",
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

/**
 * Convert any LangChain message format to UI-friendly Message type
 */
export function toUIMessage(msg: any): Message | null {
  const data = msg.lc ? msg.kwargs : msg;

  // Determine message type based on format
  let messageType: string;

  if (msg.lc === 1 && msg.type === "constructor" && Array.isArray(msg.id)) {
    // Serialized format: { lc: 1, type: "constructor", id: ["langchain_core", "messages", "HumanMessage"], kwargs: {...} }
    const className = msg.id[msg.id.length - 1]; // Get "HumanMessage", "AIMessage", "ToolMessage"
    if (className === "HumanMessage") {
      messageType = "human";
    } else if (className === "AIMessage") {
      messageType = "ai";
    } else if (className === "ToolMessage") {
      messageType = "tool";
    } else {
      messageType = "ai"; // fallback
    }
  } else if (msg.type && typeof msg.type === "string" && !msg.lc) {
    // Streaming format: { type: "human", content: "...", id: "..." } (no lc property)
    messageType = msg.type;
  } else {
    // Direct LangChain object format
    messageType =
      msg.constructor?.name?.replace("Message", "").toLowerCase() || "ai";
  }

  // Filter out tool messages
  if (messageType === "tool") return null;

  // Normalize content
  let content = data.content || "";
  if (Array.isArray(content)) {
    content = content
      .map((item) => (typeof item === "string" ? item : item.text || ""))
      .join(" ")
      .trim();
  }

  return {
    id:
      data.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: messageType === "human" ? "human" : "ai",
    content: String(content),
    timestamp: msg.timestamp || new Date().toISOString(),
    metadata: {
      type:
        messageType === "human"
          ? MESSAGE_TYPES.USER_MESSAGE
          : MESSAGE_TYPES.AGENT_RESPONSE,
    },
  };
}

export interface ApiResponse {
  message: string;
  success: boolean;
}
