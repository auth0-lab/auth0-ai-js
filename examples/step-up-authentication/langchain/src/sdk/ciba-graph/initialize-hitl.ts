import { ToolMessage } from "@langchain/core/messages";
import { Command, interrupt } from "@langchain/langgraph";

import { HumanResponse } from "../types";
import { ICIBAGraph, State } from "./types";
import { getToolDefinition } from "./utils";

export const initializeHITL =
  (cibaGraph: ICIBAGraph) =>
  async (state: State): Promise<any> => {
    const tools = cibaGraph.getTools();
    const toolDefinition = getToolDefinition(state, tools);

    // if no tool calls, resume
    if (!toolDefinition) {
      return new Command({ resume: true });
    }

    const { metadata, tool, message } = toolDefinition;
    const humanReview = interrupt(
      "A push notification has been sent to your device."
    );

    if (humanReview === HumanResponse.APPROVED) {
      const updatedMessage = {
        role: "ai",
        content: "The user has approved the transaction",
        tool_calls: [
          {
            id: tool.id,
            name: tool.name,
            args: tool.args,
          },
        ],
        id: message.id,
      };

      return new Command({
        goto: metadata.options.onApproveGoTo,
        update: { messages: [updatedMessage] },
      });
    } else {
      const toolMessage = new ToolMessage({
        name: tool.name,
        content: "The user has rejected the transaction.",
        tool_call_id: tool.id!,
      });
      return new Command({
        goto: metadata.options.onRejectGoTo,
        update: { messages: [toolMessage] },
      });
    }
  };
