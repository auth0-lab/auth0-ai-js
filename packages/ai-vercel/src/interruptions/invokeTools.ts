import { Message, Tool } from "ai";

type ContinueParams = {
  tools: { [key: string]: Tool },
  messages: Message[]
  persistMessage?: (message: Message) => Promise<void>
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
export const invokeTools = async ({ messages, tools, persistMessage }: ContinueParams) => {
  const lastMessage = messages[messages.length - 1];
  const lastPart = lastMessage?.parts && lastMessage?.parts[lastMessage.parts.length - 1];

  if (!lastPart || lastPart.type !== 'tool-invocation') {
    return;
  }
  const lastToolInvocation = lastPart.toolInvocation;

  if (!lastToolInvocation) { return; }

  if (lastMessage && lastToolInvocation && lastToolInvocation.state === 'result' && lastToolInvocation.result?.continueInterruption) {
    const tool = tools[lastToolInvocation.toolName as keyof typeof tools];
    if (!tool) {
      console.warn(`Last message contains a tool invocation in state result but the tool ${lastToolInvocation.toolName} is not found in the tools object`);
    }
    try {
      const result = await tool.execute!(lastToolInvocation.args, {
        toolCallId: lastToolInvocation.toolCallId,
        messages: []
      });
      lastPart.toolInvocation = {
        ...lastToolInvocation,
        state: 'result',
        result,
      };
    } catch (err: any) {
      lastPart.toolInvocation = {
        ...lastToolInvocation,
        state: 'call',
      };
      if (persistMessage) {
        await persistMessage(lastMessage);
      }
      throw err;
    }
    if (persistMessage) {
      await persistMessage(lastMessage);
    }
  }
};
