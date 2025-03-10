import { createDataStreamResponse, Message, streamText } from "ai";

import { checkUsersCalendar } from "@/lib/ai/tools/check-user-calendar";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { generateUUID } from "@/lib/utils";
import { openai } from "@ai-sdk/openai";
import { errorSerializer, invokeTools } from "@auth0/ai-vercel/interruptions";

export const maxDuration = 30;

export async function POST(request: Request) {
  const {
    messages,
  }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json();

  return createDataStreamResponse({
    execute: async (dataStream) => {
      await invokeTools({
        messages,
        tools: {
          checkUsersCalendar,
        },
      });

      const result = streamText({
        model: openai("gpt-4o-mini"),
        system:
          "You are a friendly assistant! Keep your responses concise and helpful.",
        messages,
        maxSteps: 5,

        experimental_activeTools: ["getWeather", "checkUsersCalendar"],
        experimental_generateMessageId: generateUUID,
        tools: {
          getWeather,
          checkUsersCalendar,
        },
      });

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
      });
    },
    onError: errorSerializer((err) => {
      console.log(err);
      return "Oops, an error occured!";
    }),
  });
}
