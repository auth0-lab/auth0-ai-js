import { Auth0AI } from "@auth0/ai-vercel";

import { auth0 } from "./auth0";

const auth0AI = new Auth0AI();

export const withCalendarFreeBusyAccess = auth0AI.withFederatedConnection({
  getRefreshToken: async () => {
    const session = await auth0.getSession();
    const refreshToken = session?.tokenSet.refreshToken! as string;
    return refreshToken;
  },
  connection: 'google-oauth2',
  scopes: ["https://www.googleapis.com/auth/calendar.freebusy"],
});
