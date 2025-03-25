import { DynamicStructuredTool } from "langchain/tools";

import { LangGraphRunnableConfig } from "@langchain/langgraph";

import { ZodObjectAny } from "./ToolWrapper";

export const ToolContext = <T extends ZodObjectAny = ZodObjectAny>(
  t: DynamicStructuredTool<T>
) => {
  return (_params: any, ctx: LangGraphRunnableConfig) => {
    const { thread_id, tool_call_id } = ctx.configurable ?? {};
    return {
      threadID: thread_id,
      toolCallID: tool_call_id,
      toolName: t.name,
    };
  };
};
