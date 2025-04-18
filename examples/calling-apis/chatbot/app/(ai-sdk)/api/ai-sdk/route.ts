import { createDataStreamResponse, Message, streamText } from "ai";

import { checkUsersCalendar, googleDriveTools, listChannels, listRepositories } from "@/app/(ai-sdk)/lib/tools/";
import { openai } from "@ai-sdk/openai";
import { setAIContext } from "@auth0/ai-vercel";
import { errorSerializer, withInterruptions } from "@auth0/ai-vercel/interrupts";

export async function POST(request: Request) {
  const {
    id,
    messages,
  }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json();

  setAIContext({ threadID: id });

  const tools = {
    checkUsersCalendar,
    listRepositories,
    listChannels,
    ...googleDriveTools,
  };

  return createDataStreamResponse({
    execute: withInterruptions(
      async (dataStream) => {
        const result = streamText({
          model: openai("gpt-4o-mini"),
          system:
            "You are a friendly assistant! Keep your responses concise and helpful.",
          messages,
          maxSteps: 5,
          tools,
        });

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      {
        messages,
        tools,
      }
    ),
    onError: errorSerializer((err) => {
      console.log(err);
      return "Oops, an error occured!";
    }),
  });
}
