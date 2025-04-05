/**
 * Tool definitions for the AI chat agent
 * Tools can either require human confirmation or execute automatically
 */
import { tool } from "ai";
import { z } from "zod";
import { addHours } from "date-fns";
import { getAccessTokenForConnection } from "@auth0/ai-vercel";
import { FederatedConnectionError } from "@auth0/ai/interrupts";

export const getWeather = tool({
  description: "Get the current weather at a location",
  parameters: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  execute: async ({ latitude, longitude }) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
    );

    const weatherData = await response.json();

    return weatherData;
  },
});

export const checkUsersCalendar = tool({
  description: "Check user availability on a given date time on their calendar",
  parameters: z.object({
    date: z.coerce.date(),
  }),
  execute: async ({ date }) => {
    const credentials = getAccessTokenForConnection();
    const accessToken = credentials?.accessToken;
    const url = "https://www.googleapis.com/calendar/v3/freeBusy";
    const body = JSON.stringify({
      timeMin: date,
      timeMax: addHours(date, 1),
      timeZone: "UTC",
      items: [{ id: "primary" }],
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new FederatedConnectionError(
          `Authorization required to access the Federated Connection`
        );
      }
      throw new Error(
        `Invalid response from Google Calendar API: ${
          response.status
        } - ${await response.text()}`
      );
    }

    const busyResp = await response.json();
    // @ts-expect-error return type unknown
    return { available: busyResp.calendars.primary.busy.length === 0 };
  },
});
