import { z } from "zod";

import { tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

export const checkCountryHoliday = tool(
  async ({ date, country }, config: LangGraphRunnableConfig) => {
    return `${date} is holiday in ${country}`;
  },
  {
    name: "check_country_holiday",
    description:
      "Use this function to check if a given date is a holiday in the given country.",
    schema: z.object({
      date: z.coerce.date(),
      country: z
        .string()
        .describe(
          'The country code in ISO 3166-1 alpha-2 format. For example, "US" for the United States.'
        ),
    }),
  }
);
