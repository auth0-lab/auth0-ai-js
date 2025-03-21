import { tool } from "ai";
import { addHours } from "date-fns";
import { z } from "zod";

import { withTokenForGoogleConnection } from "@/lib/auth0-ai";
import { getAccessTokenForConnection } from "@auth0/ai-vercel";
import { FederatedConnectionError } from "@auth0/ai/interrupts";

export const checkUsersCalendar = withTokenForGoogleConnection(
  tool({
    description:
      "Check user availability on a given date time on their calendar",
    parameters: z.object({
      date: z.coerce.date(),
    }),
    execute: async ({ date }) => {
      const accessToken = getAccessTokenForConnection();
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
    },
  })
);
