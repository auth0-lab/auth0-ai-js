import { DynamicStructuredTool } from "@langchain/core/tools";
import { google } from "googleapis";
import { z } from "zod";

import { getAccessTokenForConnection } from "@auth0/ai-langchain";

import { withGoogleCalendar } from "../auth";

/**
 * Tool: listNearbyEvents
 * Lists calendar events between a start and end time from a specified calendar.
 * Uses the enhanced @auth0/ai-langchain SDK for federated connection token management.
 */
export const listNearbyEvents = withGoogleCalendar(
  new DynamicStructuredTool({
    name: "listNearbyEvents",
    description:
      "List calendar events between a given start and end time from a user's calendar (personal or shared)",
    schema: z.object({
      start: z.coerce.date(),
      end: z.coerce.date(),
      calendarId: z.string().optional().default("primary"),
    }),
    func: async ({ start, end, calendarId }) => {
      // Fix truncated calendar IDs by appending the correct suffix
      let fullCalendarId = calendarId;
      if (!calendarId.includes("@") && calendarId.startsWith("c_")) {
        fullCalendarId = `${calendarId}@group.calendar.google.com`;
      } else if (!calendarId.includes("@") && !calendarId.startsWith("c_")) {
        // For primary calendar (email format)
        fullCalendarId = calendarId; // Keep as is, it should be an email
      }

      // Get the federated access token using the enhanced SDK
      const token = getAccessTokenForConnection();

      const calendar = google.calendar("v3");
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: token });

      const response = await calendar.events.list({
        auth,
        calendarId: fullCalendarId,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 10,
      });

      return JSON.stringify({
        calendarId: fullCalendarId,
        events:
          response.data.items?.map((ev) => ({
            id: ev.id,
            summary: ev.summary,
            start: ev.start?.dateTime ?? ev.start?.date,
            end: ev.end?.dateTime ?? ev.end?.date,
            location: ev.location ?? "No location",
          })) ?? [],
      });
    },
  })
);
