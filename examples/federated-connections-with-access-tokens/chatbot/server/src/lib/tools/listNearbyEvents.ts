import { tool } from "ai";
import { google } from "googleapis";
import { z } from "zod";

import { getAccessTokenForConnection } from "../getAccessTokenForConnection";

/**
 * Tool: listCalendarEvents
 * Lists calendar events between a start and end time from a specified calendar.
 */
export const listNearbyEvents = tool({
  description:
    "List calendar events between a given start and end time from a user’s calendar (personal or shared)",
  parameters: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
    calendarId: z.string().optional().default("primary"),
  }),
  execute: async ({ start, end, calendarId }) => {
    if (!global.authContext) {
      throw new Error("Authentication context not available");
    }

    const { userSub, accessToken, domain, clientId, clientSecret } =
      global.authContext;

    // Get federated access token for Google Calendar
    const token = await getAccessTokenForConnection({
      domain,
      clientId,
      clientSecret,
      connection: "google-oauth2",
      loginHint: userSub,
      subjectToken: accessToken,
    });

    const calendar = google.calendar("v3");
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    console.log(
      `Listing events between ${start.toISOString()} and ${end.toISOString()} for calendar ${calendarId}`
    );

    const response = await calendar.events.list({
      auth,
      calendarId,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 10,
    });

    return {
      calendarId,
      events:
        response.data.items?.map((ev) => ({
          id: ev.id,
          summary: ev.summary,
          start: ev.start?.dateTime ?? ev.start?.date,
          end: ev.end?.dateTime ?? ev.end?.date,
          location: ev.location ?? "No location",
        })) ?? [],
    };
  },
});
