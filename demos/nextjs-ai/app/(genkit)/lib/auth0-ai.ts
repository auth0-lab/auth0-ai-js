import { auth0 } from "@/lib/auth0";
import { Auth0AI } from "@auth0/ai-genkit";

import { ai } from "./genkit";

const auth0AI = new Auth0AI({
  genkit: ai,
});

export const withTokenForGoogleConnection = auth0AI.withTokenForConnection({
  refreshToken: async () => {
    const session = await auth0.getSession();
    const refreshToken = session?.tokenSet.refreshToken as string;
    return refreshToken;
  },
  connection: "google-oauth2",
  scopes: ["https://www.googleapis.com/auth/calendar.freebusy"],
});
