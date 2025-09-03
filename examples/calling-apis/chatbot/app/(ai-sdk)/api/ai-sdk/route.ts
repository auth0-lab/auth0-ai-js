import { UIMessage, streamText, createUIMessageStream, createUIMessageStreamResponse, convertToModelMessages } from "ai";

import { checkUsersCalendar, googleDriveTools, listChannels, listRepositories } from "@/app/(ai-sdk)/lib/tools/";
import { openai } from "@ai-sdk/openai";
import { setAIContext } from "@auth0/ai-vercel";
import { errorSerializer, InterruptionPrefix, withInterruptions } from "@auth0/ai-vercel/interrupts";
import { Auth0Interrupt } from "@auth0/ai/interrupts";

export async function POST(request: Request) {
  const {
    id,
    messages,
  }: { id: string; messages: Array<UIMessage>; selectedChatModel: string } =
    await request.json();

  setAIContext({ threadID: id });

  const tools = {
    checkUsersCalendar,
    listRepositories,
    listChannels,
    ...googleDriveTools,
  };

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: withInterruptions(
      async ({ writer }) => {
        const result = streamText({
          model: openai("gpt-4o-mini"),
          system:
            "You are a friendly assistant! Keep your responses concise and helpful.",
            messages: convertToModelMessages(messages),
          tools,
        });

        writer.merge(result.toUIMessageStream({
          sendReasoning: true,
          onError: (error) => {
            const serializableError = {
              ...error as Auth0Interrupt,
            };
        
            const result = `${InterruptionPrefix}${JSON.stringify(serializableError)}`;
            throw new Error(result);
          },
        }));
      },
      {
        messages: messages,
        tools,
      }
    )
  });

  return createUIMessageStreamResponse({ stream }); 
}

