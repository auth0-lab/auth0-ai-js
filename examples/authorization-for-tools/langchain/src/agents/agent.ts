import "dotenv/config";

import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import { systemPrompt } from "./system-prompt";
import { buyTool } from "./tools/buy";

const model = new ChatOpenAI({ model: "gpt-4o-mini" });

export const graph = createReactAgent({
  llm: model,
  tools: [buyTool],
  prompt: systemPrompt,
});
