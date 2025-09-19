import type { UIMessage } from "ai";

// Generic extraction of any tool part from UIMessage parts
export type AnyToolPart = Extract<
  NonNullable<UIMessage["parts"]>[number],
  { type: `tool-${string}` }
> & {
  toolCallId?: string; // some SDK versions always include this, make optional to be safe
  state?: string;
  input?: Record<string, unknown>;
  output?: unknown;
};

// Pending tool input part (awaiting human approval or execution)
export type PendingToolInputPart = AnyToolPart & {
  toolCallId: string;
  state: "input-available";
  input?: Record<string, unknown>;
};

// Tool part with an output available
export type ToolPartWithOutput = AnyToolPart & {
  toolCallId: string;
  state: "output-available";
  output?: unknown;
};

// Narrow helper type guards if needed later
export function isPendingToolInputPart(
  part: AnyToolPart
): part is PendingToolInputPart {
  return (
    part.type.startsWith("tool-") &&
    part.state === "input-available" &&
    typeof part.toolCallId === "string"
  );
}

export function isToolPartWithOutput(
  part: AnyToolPart
): part is ToolPartWithOutput {
  return (
    part.type.startsWith("tool-") &&
    part.state === "output-available" &&
    typeof part.toolCallId === "string"
  );
}

// addToolResult payload shape (re-usable)
export type AddToolResultPayload = {
  tool: string;
  toolCallId: string;
  output: string | Record<string, unknown>;
};

export type AddToolResultFn = (
  payload: AddToolResultPayload
) => Promise<unknown> | void;
