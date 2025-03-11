import { createDataStreamResponse, LangChainAdapter, Message } from "ai";
import { NextRequest } from "next/server";

import { getWeather } from "@/lib/ai/langchain/tools/get-weather";
import { convertVercelMessageToLangChainMessage } from "@/lib/utils";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return createDataStreamResponse({
    execute: async (dataStream) => {
      const body = await req.json();

      const messages = (body.messages ?? [])
        .filter(
          (message: Message) =>
            message.role === "user" || message.role === "assistant"
        )
        .map(convertVercelMessageToLangChainMessage);

      const chat = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0,
      });

      const agent = createReactAgent({
        llm: chat,
        tools: [getWeather],
      });

      const eventStream = agent.streamEvents({ messages }, { version: "v2" });

      LangChainAdapter.mergeIntoDataStream(eventStream, {
        dataStream,
      });
    },
    onError: (err) => {
      console.log(err);
      return "Oops, an error occured!";
    },
  });
}
