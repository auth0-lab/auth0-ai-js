import { GenkitBeta, ToolRequestPart, z } from "genkit/beta";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import { ContextGetter } from "@auth0/ai/authorizers";
import { Auth0Interrupt } from "@auth0/ai/interrupts";
import {
  ToolAction,
  ToolConfig,
  ToolFn,
  ToolFnOptions,
  ToolRunOptions,
} from "@genkit-ai/ai/tool";

export type ToolWrapper = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  ...t: ToolDefinition<I, O>
) => ToolDefinition<I, O>;

export type ToolDefinition<I extends z.ZodTypeAny, O extends z.ZodTypeAny> = [
  config: ToolConfig<I, O>,
  fn: ToolFn<I, O>,
];

type TProtectFunc = (
  getContext: ContextGetter<[any, ToolFnOptions & ToolRunOptions]>,
  execute: (args_0: any, args_1: ToolFnOptions & ToolRunOptions) => any
) => (args_0: any, args_1: ToolFnOptions & ToolRunOptions) => any;

const toolCallStorage = new AsyncLocalStorage<{
  toolCallID: string;
  toolName: string;
  threadID: string;
  interrupt: (metadata?: Record<string, any>) => never;
}>();

export const createToolWrapper = (
  genkit: GenkitBeta,
  protect: TProtectFunc
): ToolWrapper => {
  return <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
    ...toolDefinition: ToolDefinition<I, O>
  ): ToolDefinition<I, O> => {
    const toolMeta = toolDefinition[0];
    return [
      toolDefinition[0],
      protect((_params, { resumed, interrupt }) => {
        const threadID = genkit.currentSession().id;
        const toolName = toolMeta.name;

        let toolCallID =
          (typeof resumed === "object" && resumed?.toolCall?.toolCallID) ||
          toolCallStorage.getStore()?.toolCallID;

        if (!toolCallID) {
          toolCallID = randomUUID();
          toolCallStorage.enterWith({
            threadID,
            toolName,
            toolCallID,
            interrupt,
          });
        }

        return { threadID, toolName, toolCallID };
      }, toolDefinition[1]),
    ];
  };
};

export const toGenKitInterrupt = (err: Auth0Interrupt) => {
  const store = toolCallStorage.getStore();
  if (!store) {
    throw new Error(
      "Tool call storage is not available. This should be used inside an authorizer protected function."
    );
  }
  const { interrupt, ...toolCall } = store;
  return interrupt({
    ...err.toJSON(),
    toolCall: toolCall,
  });
};

/**
 *
 * Build a list of GenKit restart confirmations from the
 * Auth0 interrupted tool requests.
 *
 * @param tools - The list of tools that are used in the session.
 * @param interruptedToolRequests - The list of interrupted tool requests.
 * @returns A list of GenKit restart confirmations.
 */
export const getAuth0Confirmations = (
  tools: ToolAction[],
  ...interruptedToolRequests: (ToolRequestPart | undefined)[]
) => {
  return interruptedToolRequests
    .filter(
      (itr): itr is ToolRequestPart =>
        typeof itr !== "undefined" &&
        Auth0Interrupt.isInterrupt(itr.metadata?.interrupt)
    )
    .map((interruptedToolRequest: ToolRequestPart) => {
      const tool = tools.find(
        (t) => t.__action.name === interruptedToolRequest.toolRequest.name
      );
      if (!tool) {
        throw new Error(
          `Interrupted tool not found ${interruptedToolRequest.toolRequest.name}`
        );
      }
      return tool.restart(
        interruptedToolRequest,
        interruptedToolRequest.metadata?.interrupt
      );
    });
};

/**
 * Builds the resume function for the Auth0 interrupted tool requests.
 * Use this function only if you don't expect other type of interrupts
 * besides Auth0 authorizers.
 *
 * Otherwise use `getAuth0Confirmations` to get the list of confirmations.
 *
 * @param tools - The list of tools that are used in the session.
 * @param interruptedToolRequests - The list of interrupted tool requests.
 * @returns - The resume for the Auth0 interrupted tool requests.
 */
export const resumeAuth0Interrupts = (
  tools: ToolAction[],
  ...interruptedToolRequests: (ToolRequestPart | undefined)[]
) => {
  const confirmations = getAuth0Confirmations(
    tools,
    ...interruptedToolRequests
  );
  if (confirmations.length > 0) {
    return {
      restart: confirmations,
    };
  }
};
