import { Schema, Tool } from "ai";
import crypto from "crypto";
import { stableHash } from "stable-hash";
import { z } from 'zod/v3';
import { zodToJsonSchema } from "zod-to-json-schema";

import { getAIContext } from "../context";

type Parameters = z.ZodTypeAny | Schema<any>;

//Vercel AI tools don't have a name,
// so we use the description plus parameters
// name to fabricate an id
const getToolID = (tool: Tool) => {
  const params = zodToJsonSchema(tool.inputSchema as any);
  const sh = stableHash({ description: tool.description, inputSchema: params });
  return crypto.createHash("MD5").update(sh).digest("hex");
};

export const ToolContext = <PARAMETERS extends Parameters = any, RESULT = any>(
  tool: Tool<PARAMETERS, RESULT>
) => {
  return (_params: any, ctx: any) => {
    const { threadID } = getAIContext();
    return {
      threadID,
      toolCallID: ctx.toolCallId,
      toolName: getToolID(tool),
    };
  };
};
