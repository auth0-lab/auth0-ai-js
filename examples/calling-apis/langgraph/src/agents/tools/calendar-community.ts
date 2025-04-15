import { getAccessTokenForConnection } from "@auth0/ai-langchain";
import { GoogleCalendarViewTool } from "@langchain/community/tools/google_calendar";
import { ChatOpenAI } from "@langchain/openai";

import { withGoogleCalendarCommunity2 } from "../../lib/auth0-ai";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

// const test = new GoogleCalendarViewTool({
//   credentials: {
//     accessToken: async () => {
//       return ""
//     },
//     calendarId: "primary",
//   },
//   model,
// })

// test.params

export const calendarCommunityTool = withGoogleCalendarCommunity2(
  new GoogleCalendarViewTool({
    credentials: {
      accessToken: async () => {
        const credentials = getAccessTokenForConnection();
        return credentials.accessToken;
      },
      calendarId: "primary",
    },
    model,
  })
);
