import { google } from "googleapis";
import { z } from "zod";

import { getAccessTokenForConnection } from "@auth0/ai-langchain";
import { DynamicStructuredTool } from "@langchain/core/tools";

import type { Context } from "hono";
import type { ToolWrapper } from "@auth0/ai-langchain";

/**
 * Factory function to create listNearbyEvents tool with auth context
 */
export const createListNearbyEventsTool = (withGoogleCalendar: ToolWrapper) => {
  return withGoogleCalendar(
    new DynamicStructuredTool({
      name: "listNearbyEvents",
      description:
        "List calendar events between a given start and end time from a user's calendar (personal or shared)",
      schema: z.object({
        start: z.coerce.date(),
        end: z.coerce.date(),
        calendarId: z.string().optional().nullable().default("primary"),
      }),
      func: async ({ start, end, calendarId }) => {
        // Handle null/undefined calendarId with default
        const actualCalendarId = calendarId || "primary";

        // Fix truncated calendar IDs by appending the correct suffix
        let fullCalendarId = actualCalendarId;
        if (
          !actualCalendarId.includes("@") &&
          actualCalendarId.startsWith("c_")
        ) {
          fullCalendarId = `${actualCalendarId}@group.calendar.google.com`;
        } else if (
          !actualCalendarId.includes("@") &&
          !actualCalendarId.startsWith("c_")
        ) {
          // For primary calendar (email format)
          fullCalendarId = actualCalendarId; // Keep as is, it should be an email
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
};
