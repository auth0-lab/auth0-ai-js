import { GoogleCalendarViewTool } from "@langchain/community/tools/google_calendar";
import { ChatOpenAI } from "@langchain/openai";

import { withGoogleCalendarCommunity } from "../../lib/auth0-ai";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

export const calendarCommunityTool = withGoogleCalendarCommunity(
  (accessToken: string) => {
    const calendarViewTool = new GoogleCalendarViewTool({
      credentials: {
        accessToken,
        calendarId: "primary",
      },
      model,
    });

    return calendarViewTool;
  }
);
