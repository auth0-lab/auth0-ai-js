import { CoreMessage, generateText, ToolExecutionError } from "ai";
import { Job } from "bullmq";

import { queue } from "@/src/queue";
import { buyStock } from "@/src/tools/buySock";
import { compareMetric } from "@/src/tools/compareMetric";
import { getStockMetric } from "@/src/tools/getStockMetric";
import { notifyUser } from "@/src/tools/notifyUser";
import { openai } from "@ai-sdk/openai";
import {
  appendToolCall,
  Interruption,
  invokeTools,
} from "@auth0/ai-vercel/interruptions";

import { ConditionalTrade } from "../../ConditionalTrade";

export type ConditionalTradeHandlerParams = ConditionalTrade & {
  messages?: CoreMessage[];
};

export const conditionalTrade = async (
  job: Job<ConditionalTradeHandlerParams>
) => {
  const { messages: previousMessages, ...conditionalTrade } = job.data;
  const messages = previousMessages || [
    {
      role: "user",
      content: `I would like to execute the following conditional trade:

      ${JSON.stringify(conditionalTrade)}

      Once the trade is actually executed and the stock is purchased, please notify me via email.
`,
    },
  ];

  try {
    const tools = {
      getStockMetric,
      compareMetric,
      buyStock,
      notifyUser,
    };

    console.log(`Invoking previously interrupted tools if any`);
    await invokeTools({
      messages,
      tools,
      onToolResult: async (message: CoreMessage) => {
        messages.push(message);
        await job.updateData({
          ...conditionalTrade,
          messages,
        });
      },
    });

    console.log(`Calling the LLM`);
    const r = await generateText({
      model: openai("gpt-4o", { parallelToolCalls: false }),
      system:
        "You are a fictional stock trader bot. Please execute the trades of the user.",
      messages,
      maxSteps: 5,
      tools,
      onStepFinish: async (step) => {
        const newMessages = [...messages, ...step.response.messages];
        await job.updateData({
          ...conditionalTrade,
          messages: newMessages,
        });
        const conditionIsMet = step.toolResults.some(
          (r) => r.toolName === "compareMetric" && r.result === true
        );
        if (conditionIsMet) {
          console.log("Condition met! Stopping the scheduler");
          await queue.removeJobScheduler(job.data.tradeID);
        }
      },
    });
    console.log(`${r.text}`);
  } catch (err) {
    if (
      err instanceof ToolExecutionError &&
      err.cause instanceof Interruption
    ) {
      const newMessages = appendToolCall(messages, err);
      await job.updateData({
        ...conditionalTrade,
        messages: newMessages,
      });

      const isFinal = "isFinal" in err.cause && err.cause.isFinal;

      console.log(err.cause.message);

      if (isFinal) {
        console.log("Final error, do not retry.");
        return;
      }
    }

    throw err;
  }
};
