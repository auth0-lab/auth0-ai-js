import { z } from "zod";

import { tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

export const weatherTool = tool(
  async (input: { city: string }, config: LangGraphRunnableConfig) => {
    //
    const store = config.store!;

    console.log(await store.get(["auth0"], "xxx"));

    console.log("----");
    console.log(`Searching for: ${input.city}`);
    console.log("----");
    return "Sunny!";
  },
  {
    name: "weather_search",
    description: "Search for the weather",
    schema: z.object({
      city: z.string(),
    }),
  }
);
