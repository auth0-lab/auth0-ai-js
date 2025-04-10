import { auth0 } from "@/lib/auth0";
import { Auth0AI } from "@auth0/ai-llamaindex";

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
