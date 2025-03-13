import { addHours } from "date-fns";
import { z } from "zod";

import { getAccessTokenForConnection } from "@auth0/ai-langchain";
import { FederatedConnectionError } from "@auth0/ai/interrupts";
import { tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

export const checkUserCalendar = tool(
  async ({ date }, config: LangGraphRunnableConfig) => {
    // return "Yes you are available";
    const accessToken = getAccessTokenForConnection();
    if (!accessToken) {
      //TODO: what we do?
      throw new Error(
        `Authorization required to access the Federated Connection`
      );
    }

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
        //TODO: what we do?
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
    name: "check_user_calendar",
    description:
      "Use this function to check if the user is available on a certain date and time",
    schema: z.object({
      date: z.coerce.date(),
    }),
  }
);
