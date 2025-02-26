import { createDataStreamResponse, Message, smoothStream, streamText } from "ai";

import { systemPrompt } from "@/lib/ai/prompts";
import { checkUsersCalendar } from "@/lib/ai/tools/check-user-calendar";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { auth0 } from "@/lib/auth0";
import { deleteChatById, getChatById, saveChat, saveMessages } from "@/lib/db/queries";
import { generateUUID, getMostRecentUserMessage, sanitizeResponseMessages } from "@/lib/utils";
import { openai } from "@ai-sdk/openai";
import { errorSerializer, invokeTools } from "@auth0/ai-vercel/interruptions";

import { generateTitleFromUserMessage } from "../../actions";

export const maxDuration = 60;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
  }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json();

  const session = await auth0.getSession();

  if (!session || !session.user || !session.user.sub) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = { id: session.user.sub, email: session.user.email! };

  const userMessage = getMostRecentUserMessage(messages);

  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, title, user });
  }

  await saveMessages({
    messages: [{ ...userMessage, chatId: id }],
  });

  return createDataStreamResponse({
    execute: async (dataStream) => {
      await invokeTools({
        messages,
        tools: {
          checkUsersCalendar,
        },
        persistMessage: async (message: Message) => {
          await saveMessages({
            messages: [{ ...message, chatId: id }],
          });
        },
      });

      const result = streamText({
        model: openai("gpt-4o-mini"),
        system: systemPrompt({ selectedChatModel }),
        messages,
        maxSteps: 5,
        // maxSteps: 1,
        experimental_activeTools:
          selectedChatModel === "chat-model-reasoning"
            ? []
            : ["getWeather", "checkUsersCalendar"],
        experimental_transform: smoothStream({ chunking: "word" }),
        experimental_generateMessageId: generateUUID,
        tools: {
          getWeather,
          checkUsersCalendar,
        },
        onFinish: async ({ response, reasoning }) => {
          if (session.user?.sub) {
            try {
              const sanitizedResponseMessages = sanitizeResponseMessages({
                messages: response.messages,
                reasoning,
              });

              dataStream.writeMessageAnnotation({
                type: "status",
                value: "processing",
              });

              const messages = sanitizedResponseMessages.map(
                (message: { id: any; role: any; content: any; }) => {
                  return {
                    id: message.id,
                    chatId: id,
                    role: message.role,
                    content: message.content,
                  };
                }
              );
              await saveMessages({
                messages,
              });
            } catch (error) {
              console.error("Failed to save chat");
            }
          }
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

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth0.getSession();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.sub) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
