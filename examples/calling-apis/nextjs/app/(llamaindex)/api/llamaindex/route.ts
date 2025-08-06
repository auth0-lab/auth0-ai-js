import {
  createDataStreamResponse,
  LlamaIndexAdapter,
  Message,
  ToolExecutionError,
} from "ai";
import { ChatMessage, OpenAIAgent } from "llamaindex";

import {
  checkUsersCalendar,
  listChannels,
  listRepositories,
} from "@/app/(llamaindex)/lib/tools/";
import { setAIContext } from "@auth0/ai-llamaindex";
import { withInterruptions } from "@auth0/ai-llamaindex/interrupts";
import { errorSerializer } from "@auth0/ai-vercel/interrupts";

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Message[] } =
    await request.json();

  setAIContext({ threadID: id });

  return createDataStreamResponse({
    execute: withInterruptions(
      async (dataStream) => {
        const agent = new OpenAIAgent({
          systemPrompt: "You are an AI assistant",
          tools: [checkUsersCalendar(), listChannels(), listRepositories()],
          chatHistory: messages as ChatMessage[],
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
