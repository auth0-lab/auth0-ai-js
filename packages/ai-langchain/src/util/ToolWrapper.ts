import { z } from "zod";

import { DynamicStructuredTool, Tool } from "@langchain/core/tools";

export type ZodObjectAny = z.ZodObject<any, any, any, any>;

export type ToolWrapper = <T extends ZodObjectAny>(
  t: DynamicStructuredTool<T>
) => DynamicStructuredTool<T>;

export type CommunityToolWrapper = (accessToken: string) => Tool;
