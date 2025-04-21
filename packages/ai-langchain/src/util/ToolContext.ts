import { ToolLike } from "./ToolWrapper";

export const ToolContext = (t: ToolLike) => {
  return (_params: any, ctx: any) => {
    const { thread_id, tool_call_id } = ctx.configurable ?? {};
    return {
      threadID: thread_id,
      toolCallID: tool_call_id,
      toolName: t.name,
    };
  };
};
