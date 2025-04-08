import { addHours } from "date-fns";
import { z } from "zod";

import { getAccessTokenForConnection } from "@auth0/ai-genkit";
import { FederatedConnectionError } from "@auth0/ai/interrupts";

import { withTokenForGoogleConnection } from "../auth0-ai";
import { ai } from "../genkit";

export const checkUsersCalendar = ai.defineTool(
  ...withTokenForGoogleConnection(
    {
      description:
        "Check user availability on a given date time on their calendar",
      inputSchema: z.object({
        date: z.coerce
          .date()
          .describe("Date to check availability for in UTC time always."),
      }),
      outputSchema: z.object({
        available: z.boolean(),
      }),
      name: "checkUsersCalendar",
    },
    async ({ date }) => {
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
      return { available: busyResp.calendars.primary.busy.length === 0 };
    }
  )
);
