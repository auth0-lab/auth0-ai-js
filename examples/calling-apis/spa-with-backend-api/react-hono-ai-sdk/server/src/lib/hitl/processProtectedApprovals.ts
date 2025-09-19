import { getToolName, isToolUIPart } from "ai";

import { HITL_APPROVAL } from "@auth0/auth0-ai-js-examples-react-hono-ai-sdk-shared";

import type { UIMessage, UIMessageStreamWriter } from "ai";

// Execute function (server-side side effect for approved protected API call)
async function executeCallProtectedApi(
  input: { reason?: string } | undefined,
  auth?: { jwtPayload?: { sub?: string } }
): Promise<string> {
  const reason = input?.reason || "(none)";
  return `Protected API data retrieved for ${auth?.jwtPayload?.sub}. Reason: ${reason}`;
}

/**
 * Processes the last message for a confirmed or denied callProtectedApi tool invocation.
 * Mirrors the AI SDK v5 HITL cookbook: checks last message parts, and when a tool
 * result contains an approval token, executes (or denies) and streams updated output.
 */
export async function processProtectedApprovals(options: {
  messages: UIMessage[];
  writer: UIMessageStreamWriter<UIMessage>;
  auth?: { jwtPayload?: { sub?: string } } | undefined;
}) {
  const { messages, writer, auth } = options;
  const last = messages[messages.length - 1];
  if (!last) return;

  const parts = last.parts || [];
  let changed = false;
  const newParts = await Promise.all(
    parts.map(async (part) => {
      if (!isToolUIPart(part)) return part;
      const toolName = getToolName(part);
      if (toolName !== "callProtectedApi") return part;
      if (part.state !== "output-available") return part; // still awaiting user choice
      const output = part.output as string | undefined;

      switch (output) {
        case HITL_APPROVAL.YES: {
          const result = await executeCallProtectedApi(part.input as any, auth);
          writer.write({
            type: "tool-output-available",
            toolCallId: part.toolCallId,
            output: result,
          });
          changed = true;
          return { ...part, output: result };
        }
        case HITL_APPROVAL.NO: {
          const denial = "Error: User denied access to protected API";
          writer.write({
            type: "tool-output-available",
            toolCallId: part.toolCallId,
            output: denial,
          });
          changed = true;
          return { ...part, output: denial };
        }
        default:
          return part; // unrecognized output; leave unchanged
      }
    })
  );
  if (changed) {
    last.parts = newParts as any;
  }
}

export { executeCallProtectedApi };
