import { z } from "genkit";
import { GenkitBeta } from "genkit/beta";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import { ContextGetter } from "@auth0/ai/authorizers";
import { Auth0Interrupt } from "@auth0/ai/interrupts";
import {
  ToolAction,
  ToolFnOptions,
  ToolInterruptError,
  ToolRunOptions,
} from "@genkit-ai/ai/tool";

export type ToolWrapper = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  t: ToolAction<I, O>
) => ToolAction<I, O>;

type TProtectFunc = (
  getContext: ContextGetter<[any, ToolFnOptions & ToolRunOptions]>,
  execute: (args_0: any, args_1: ToolFnOptions & ToolRunOptions) => any
) => (args_0: any, args_1: ToolFnOptions & ToolRunOptions) => any;

const toolCallStorage = new AsyncLocalStorage<{
  toolCallID: string;
  toolName: string;
  threadID: string;
}>();

export const createToolWrapper = (
  genkit: GenkitBeta,
  protect: TProtectFunc
): ToolWrapper => {
  return ((t) => {
    const toolMeta = t.__action;
    // Currently genkit does not support tool wrapping, overwriting
    // or deregistration, so we need to remove the tool from the registry.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const actionsById = genkit.registry.actionsById;
    delete actionsById[`/tool/${toolMeta.name}`];
    return genkit.defineTool(
      {
        name: toolMeta.name,
        description: toolMeta.description!,
        inputSchema: toolMeta.inputSchema,
        outputSchema: toolMeta.outputSchema,
      },
      protect((params, { resumed }) => {
        const threadID = genkit.currentSession().id;
        const toolName = toolMeta.name;

        let toolCallID =
          (typeof resumed === "object" && resumed?.toolCallID) ||
          toolCallStorage.getStore()?.toolCallID;

        if (!toolCallID) {
          toolCallID = randomUUID();
          toolCallStorage.enterWith({ threadID, toolName, toolCallID });
        }

        return { threadID, toolName, toolCallID };
      }, t)
    );
  }) as ToolWrapper;
};

export const toGenKitInterrupt = (err: Auth0Interrupt) => {
  return new ToolInterruptError({
    ...err.toJSON(),
    toolCall: toolCallStorage.getStore(),
  });
};
