// @ts-nocheck
import {
  ModelMessage,
  JSONValue,
  UIMessage,
  Tool,
  ToolCallPart,
  AISDKError,
} from "ai";

type ContinueParams<T extends UIMessage | ModelMessage> = {
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
export const invokeTools = async <T extends UIMessage | ModelMessage>({
  messages,
  tools,
  onToolResult,
}: ContinueParams<T>) => {
  if (messages.length === 0) {
    return;
  }
  if (messages.some((m) => "parts" in m)) {
    return invokeToolsMessages({
      messages: messages as UIMessage[],
      tools,
      onToolResult,
    } as ContinueParams<UIMessage>);
  }
  return invokeToolsCoreMessage({
    messages: messages as ModelMessage[],
    tools,
    onToolResult,
  } as ContinueParams<ModelMessage>);
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
}: ContinueParams<UIMessage>) => {
  const lastMessage = messages[messages.length - 1];
  const lastPart =
    lastMessage?.parts && lastMessage?.parts[lastMessage.parts.length - 1];

  if (!lastPart || lastPart.type !== "tool-invocation") {
    return;
  }
  const lastToolInvocation = lastPart;

  if (!lastToolInvocation) {
    return;
  }

  if (
    lastMessage &&
    lastToolInvocation &&
    lastToolInvocation.state === "output-available" &&
    lastToolInvocation.output?.continueInterruption
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
      lastPart.output = {
        ...lastToolInvocation,
        state: "output-available",
        result,
      };
    } catch (err: any) {
      lastPart.output = {
        ...lastToolInvocation,
        state: "call",
      };
      if (onToolResult) {
        await onToolResult(lastMessage);
      }
      throw new AISDKError({
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
}: ContinueParams<ModelMessage>) => {
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
    throw new AISDKError({
      toolCallId: lastContent.toolCallId,
      toolName: lastContent.toolName,
      toolArgs: lastContent.args as JSONValue,
      cause: err,
    });
  }
};
