export type ToolCallContext = {
  threadID: string;
  toolCallID: string;
  toolName: string;
};

export type ContextGetter<ToolExecuteArgs extends any[]> = (
  ...args: ToolExecuteArgs
) => ToolCallContext;

/**
 * AuthContext defines the scope of credential sharing:
 * - "tool-call": Credentials are valid only for a single invocation of the tool.
 * - "tool": Credentials are shared across multiple calls to the same tool within the same thread.
 * - "thread": Credentials are shared across all tools using the same authorizer within the current thread.
 * - "agent": Credentials are shared globally across all threads and tools in the agent.
 */
export type AuthContext = "tool-call" | "tool" | "thread" | "agent";

export const nsFromContext = (
  authContext: AuthContext,
  callContext: ToolCallContext
) => {
  const threadNS = ["Threads", callContext.threadID];
  const toolNS = ["Tools", callContext.toolName];
  const toolCallNS = ["ToolCalls", callContext.toolCallID];

  switch (authContext) {
    case "tool-call":
      return [...threadNS, ...toolNS, ...toolCallNS];
    case "tool":
      return [...threadNS, ...toolNS];
    case "thread":
      return threadNS;
    case "agent":
      return [];
  }
};
