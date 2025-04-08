import { Auth0AI } from "@auth0/ai-vercel";

import { auth0 } from "./auth0";

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

export const withSlack = auth0AI.withTokenForConnection({
  refreshToken: async () => {
    const session = await auth0.getSession();
    const refreshToken = session?.tokenSet.refreshToken as string;
    return refreshToken;
  },
  connection: "sign-in-with-slack",
  scopes: ["channels:read", "groups:read"],
});

export const withGitHub = auth0AI.withTokenForConnection({
  refreshToken: async () => {
    const session = await auth0.getSession();
    const refreshToken = session?.tokenSet.refreshToken as string;
    return refreshToken;
  },
  connection: "github",
  scopes: ["repo"],
});

const fgaAI = new Auth0AI.FGA();

export const withCanBuyPermission = fgaAI.withFGA({
  async buildQuery({ ticker }: { ticker: string }) {
    const session = await auth0.getSession();
    const sub = session?.user.sub as string;
    const query = {
      user: `user:${sub}`,
      relation: "can_buy",
      object: `asset:${ticker.toUpperCase()}`,
      context: { current_time: new Date().toISOString() },
    };
    console.dir(query);
    return query;
  },
  onUnauthorized() {
    return "You are not authorized to perform this purchase.";
  },
});
