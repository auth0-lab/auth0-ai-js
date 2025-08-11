import { GaxiosError } from "gaxios";
import { google } from "googleapis";
import { z } from "zod";

import { getAccessTokenForConnection } from "@auth0/ai-langchain";
import { FederatedConnectionError } from "@auth0/ai/interrupts";
import { tool } from "@langchain/core/tools";

import { withGoogleCalendar } from "../auth";

export const listUserCalendars = withGoogleCalendar(
  tool(
    async () => {
      try {
        const accessToken = getAccessTokenForConnection();

        const calendar = google.calendar("v3");
        const auth = new google.auth.OAuth2();

        auth.setCredentials({
          access_token: accessToken,
        });

        const response = await calendar.calendarList.list({
          auth,
          maxResults: 10,
        });

        const calendars = response.data.items?.map((cal) => ({
          id: cal.id,
          summary: cal.summary,
          description: cal.description,
          primary: cal.primary,
        })) || [];

        return {
          calendars,
        };
      } catch (err) {
        if (err instanceof GaxiosError && err.status === 401) {
          throw new FederatedConnectionError(
            `Authorization required to access Google Calendar`
          );
        }
        throw err;
      }
    },
    {
      name: "list_user_calendars",
      description:
        "List all calendars that the user has access to, including their primary calendar and any shared calendars.",
      schema: z.object({}),
    }
  )
);
