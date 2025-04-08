import { addHours, formatISO } from "date-fns";
import { tool } from "llamaindex";
import { z } from "zod";

import { Auth0AI, getAccessTokenForConnection } from "@auth0/ai-llamaindex";
import { FederatedConnectionError } from "@auth0/ai/interrupts";

import { auth0 } from "../../auth0";

const auth0AI = new Auth0AI();

export const withGoogleCalendar = auth0AI.withTokenForConnection({
  refreshToken: async () => {
    const session = await auth0.getSession();
    const refreshToken = session?.tokenSet.refreshToken as string;

    return refreshToken;
  },
  connection: "google-oauth2",
  scopes: ["https://www.googleapis.com/auth/calendar.freebusy"],
});

export const checkUsersCalendar = () =>
  withGoogleCalendar(
    tool(
      async ({ date }) => {
        const credentials = getAccessTokenForConnection();
        const url = "https://www.googleapis.com/calendar/v3/freeBusy";
        const body = JSON.stringify({
          timeMin: formatISO(date),
          timeMax: addHours(date, 1).toISOString(),
          timeZone: "UTC",
          items: [{ id: "primary" }],
        });

        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credentials?.accessToken}`,
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
      {
        name: "checkUsersCalendar",
        description:
          "Check user availability on a given date time on their calendar",
        parameters: z.object({
          date: z.coerce.date(),
        }),
      }
    )
  );
