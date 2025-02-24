import { z } from "zod";

import { tool } from "@langchain/core/tools";

export const weatherTool = tool(
  async (input: { city: string }) => {
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
