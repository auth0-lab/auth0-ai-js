import { AIMessage } from "@langchain/langgraph-sdk";

import { ProtectedTool, State } from "./types";

export function getToolDefinition(state: State, tools: ProtectedTool[]) {
  const message = state.messages[state.messages.length - 1] as AIMessage;

  // if no tool calls, resume
  if (!message.tool_calls) {
    return null;
  }

  const toolCalls = message.tool_calls;
  const tool = toolCalls![toolCalls!.length - 1];
  const metadata = tools.find((t) => t.toolName === tool.name);

  // if tool not found, resume
  if (!metadata) {
    return null;
  }

  return { metadata, tool, message };
}
