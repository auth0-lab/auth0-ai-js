import { addHours, formatISO } from "date-fns";
import { GaxiosError } from "gaxios";
import { google } from "googleapis";
import { z } from "zod";

import { getAccessTokenForConnection } from "@auth0/ai-langchain";
import { FederatedConnectionError } from "@auth0/ai/interrupts";
import { tool } from "@langchain/core/tools";

import { withGoogleCalendar } from "../auth";

export const checkUserCalendar = withGoogleCalendar(
  tool(
    async ({ date }) => {
      try {
        const accessToken = getAccessTokenForConnection();

        const calendar = google.calendar("v3");
        const auth = new google.auth.OAuth2();

        auth.setCredentials({
          access_token: accessToken,
        });

        const response = await calendar.freebusy.query({
          auth,
          requestBody: {
            timeMin: formatISO(date),
            timeMax: addHours(date, 1).toISOString(),
            timeZone: "UTC",
            items: [{ id: "primary" }],
          },
        });

        return {
          available: response.data?.calendars?.primary?.busy?.length === 0,
        };
      } catch (err) {
        if (err instanceof GaxiosError && err.status === 401) {
          throw new FederatedConnectionError(
            `Authorization required to access the Google Calendar`
          );
        }
        throw err;
      }
    },
    {
      name: "check_user_calendar",
      description:
        "Check if a user is free during a specific date and time (1 hour window).",
      schema: z.object({
        date: z.coerce
          .date()
          .describe("The date and time to check availability for"),
      }),
    }
  )
);
