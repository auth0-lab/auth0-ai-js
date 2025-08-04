import { tool } from "ai";
import { google } from "googleapis";
import { z } from "zod";

import { getAccessTokenForConnection } from "@auth0/ai-vercel";
import { withGoogleCalendar } from "../auth";

export const listUserCalendars = withGoogleCalendar(
  tool({
    description: "List all calendars the user has access to",
    parameters: z.object({}),
    execute: async () => {
      // Get the federated access token using the enhanced SDK
      const token = getAccessTokenForConnection();

      const calendar = google.calendar("v3");
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: token });

      const res = await calendar.calendarList.list({ auth });

      const calendars = res.data.items?.map((cal) => ({
        id: cal.id,
        name: cal.summary,
        accessRole: cal.accessRole,
      })) ?? [];
      
      return calendars;
    },
  })
);
