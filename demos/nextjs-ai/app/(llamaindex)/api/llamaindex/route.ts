/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createDataStreamResponse,
  LlamaIndexAdapter,
  Message,
  ToolExecutionError,
} from "ai";
import { OpenAIAgent } from "llamaindex";

import { setAIContext } from "@auth0/ai-llamaindex";
import { withInterruptions } from "@auth0/ai-llamaindex/interrupts";
import { errorSerializer } from "@auth0/ai-vercel/interrupts";

import { checkUsersCalendar } from "../../lib/tools/check-user-calendar";

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Message[] } =
    await request.json();

  setAIContext({ threadID: id });

  return createDataStreamResponse({
    execute: withInterruptions(
      async (dataStream) => {
        const agent = new OpenAIAgent({
          systemPrompt: "You are an AI assistant",
          tools: [checkUsersCalendar()],
          verbose: true,
        });

        const stream = await agent.chat({
          message: messages[messages.length - 1].content,
          stream: true,
        });

        LlamaIndexAdapter.mergeIntoDataStream(stream as any, { dataStream });
      },
      {
        messages,
        errorType: ToolExecutionError,
      }
    ),
    onError: errorSerializer((err) => {
      console.log(err);
      return "Oops, an error occured!";
    }),
  });
}
