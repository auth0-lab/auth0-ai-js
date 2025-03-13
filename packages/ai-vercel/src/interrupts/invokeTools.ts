import {
  CoreMessage,
  JSONValue,
  Message,
  Tool,
  ToolCallPart,
  ToolExecutionError,
} from "ai";

type ContinueParams<T extends Message | CoreMessage> = {
  /**
   * The tools that are available to be invoked.
   */
  tools: { [key: string]: Tool };

  /**
   * The messages that contain the tools to be invoked.
   */
  messages: T[];

  /**
   * A callback that is called when a tool result is available.
   * @param message - The message that contains the tool result.
   * @returns
   */
  onToolResult?: (message: T) => Promise<void>;
};

/**
 * Invoke tools that are in a result state.
 *
 * This will invoke the tools after a human interaction.
 *
 * @param {ContinueParams} param0 - The parameters to continue the tools.
 *
 * @returns
 */
export const invokeTools = async <T extends Message | CoreMessage>({
  messages,
  tools,
  onToolResult,
}: ContinueParams<T>) => {
  if (messages.length === 0) {
    return;
  }
  if (messages.some((m) => "parts" in m)) {
    return invokeToolsMessages({
      messages: messages as Message[],
      tools,
      onToolResult,
    } as ContinueParams<Message>);
  }
  return invokeToolsCoreMessage({
    messages: messages as CoreMessage[],
    tools,
    onToolResult,
  } as ContinueParams<CoreMessage>);
};

/**
 * Invoke tools that are in a result state.
 *
 * This will invoke the tools after a human interaction.
 *
 * @param {ContinueParams} param0 - The parameters to continue the tools.
 *
 * @returns
 */
const invokeToolsMessages = async ({
  messages,
  tools,
  onToolResult,
}: ContinueParams<Message>) => {
  const lastMessage = messages[messages.length - 1];
  const lastPart =
    lastMessage?.parts && lastMessage?.parts[lastMessage.parts.length - 1];

  if (!lastPart || lastPart.type !== "tool-invocation") {
    return;
  }
  const lastToolInvocation = lastPart.toolInvocation;

  if (!lastToolInvocation) {
    return;
  }

  if (
    lastMessage &&
    lastToolInvocation &&
    lastToolInvocation.state === "result" &&
    lastToolInvocation.result?.continueInterruption
  ) {
    const tool = tools[lastToolInvocation.toolName as keyof typeof tools];
    if (!tool) {
      console.warn(
        `Last message contains a tool invocation in state result but the tool ${lastToolInvocation.toolName} is not found in the tools object`
      );
    }
    try {
      const result = await tool.execute!(lastToolInvocation.args, {
        toolCallId: lastToolInvocation.toolCallId,
        messages: [],
      });
      lastPart.toolInvocation = {
        ...lastToolInvocation,
        state: "result",
        result,
      };
    } catch (err: any) {
      lastPart.toolInvocation = {
        ...lastToolInvocation,
        state: "call",
      };
      if (onToolResult) {
        await onToolResult(lastMessage);
      }
      throw new ToolExecutionError({
        toolCallId: lastToolInvocation.toolCallId,
        toolName: lastToolInvocation.toolName,
        toolArgs: lastToolInvocation.args as JSONValue,
        cause: err,
      });
    }
    if (onToolResult) {
      await onToolResult(lastMessage);
    }
  }
};

/**
 * Invoke tools that are in a result state.
 *
 * This will invoke the tools after a human interaction.
 *
 * @param {ContinueParams} param0 - The parameters to continue the tools.
 *
 * @returns
 */
const invokeToolsCoreMessage = async ({
  messages,
  tools,
  onToolResult,
}: ContinueParams<CoreMessage>) => {
  const lastMessage = messages[messages.length - 1];
  const content = lastMessage.content || [];
  const lastContent = content[content.length - 1] as ToolCallPart;
  if (lastMessage.role !== "assistant" || lastContent.type !== "tool-call") {
    return;
  }
  const tool = tools[lastContent.toolName as keyof typeof tools];
  if (!tool) {
    console.warn(
      `Last message contains a tool invocation in state result but the tool ${lastContent.toolName} is not found in the tools object`
    );
  }
  try {
    const result = await tool.execute!(lastContent.args, {
      toolCallId: lastContent.toolCallId,
      messages: [],
    });
    if (onToolResult) {
      await onToolResult({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: lastContent.toolCallId,
            toolName: lastContent.toolName,
            result,
          },
        ],
      });
    }
  } catch (err: any) {
    throw new ToolExecutionError({
      toolCallId: lastContent.toolCallId,
      toolName: lastContent.toolName,
      toolArgs: lastContent.args as JSONValue,
      cause: err,
    });
  }
};
