import { tool } from "ai";
import { addHours, formatISO } from "date-fns";
import { GaxiosError } from "gaxios";
import { google } from "googleapis";
import { z } from "zod";

import { withGoogleCalendar } from "@/lib/auth0-ai";
import { getAccessTokenForConnection } from "@auth0/ai-vercel";
import { FederatedConnectionError } from "@auth0/ai/interrupts";

export const checkUsersCalendar = withGoogleCalendar(
  tool({
    description:
      "Check user availability on a given date time on their calendar",
    parameters: z.object({
      date: z.coerce.date(),
    }),
    execute: async ({ date }) => {
      const credentials = getAccessTokenForConnection();

      try {
        // Google SDK
        const calendar = google.calendar("v3");
        const auth = new google.auth.OAuth2();

        auth.setCredentials({
          access_token: credentials?.accessToken,
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
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 401) {
            throw new FederatedConnectionError(
              `Authorization required to access the Federated Connection`
            );
          }
        }

        throw error;
      }
    },
  })
);
