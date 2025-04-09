import { z } from "zod";

import { ai } from "../genkit";

export const getWeather = ai.defineTool(
  {
    description: "Get the current weather at a location",
    inputSchema: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    outputSchema: z.object({
      current: z.object({
        time: z.string(),
        temperature_2m: z.number(),
      }),
      hourly: z.object({
        time: z.array(z.string()),
        temperature_2m: z.array(z.number()),
      }),
    }),
    name: "getWeather",
  },
  async ({ latitude, longitude }) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
    );

    const weatherData = await response.json();

    return weatherData;
  }
);
