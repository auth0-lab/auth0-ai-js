import "dotenv/config";

import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import { systemPrompt } from "../system";
import { buyTool } from "./tools/buy";

const model = new ChatOpenAI({ model: "gpt-4" });

export const graph = createReactAgent({
  llm: model,
  tools: [buyTool],
  prompt: systemPrompt,
});
