import { tool } from "ai";
import { google } from "googleapis";
import { z } from "zod";

import { getAccessTokenForConnection } from "../getAccessTokenForConnection";

export const listUserCalendars = tool({
  description: "List all calendars the user has access to",
  parameters: z.object({}),
  execute: async () => {
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

    const res = await calendar.calendarList.list({ auth });

    console.log("Fetched user calendars:", res.data);
    return (
      res.data.items?.map((cal) => ({
        id: cal.id,
        name: cal.summary,
        accessRole: cal.accessRole,
      })) ?? []
    );
  },
});
