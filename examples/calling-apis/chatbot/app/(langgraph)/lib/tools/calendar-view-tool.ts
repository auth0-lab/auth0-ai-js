import { getAccessTokenForConnection } from "@auth0/ai-langchain";
import { GoogleCalendarViewTool } from "@langchain/community/tools/google_calendar";
import { ChatOpenAI } from "@langchain/openai";

import { withGoogleCalendarCommunity } from "../../lib/auth0-ai";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

export const calendarCommunityTool = withGoogleCalendarCommunity(
  new GoogleCalendarViewTool({
    credentials: {
      accessToken: async () => {
        const credentials = getAccessTokenForConnection();
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        return credentials?.accessToken!;
      },
      calendarId: "primary",
    },
    model,
  })
);
