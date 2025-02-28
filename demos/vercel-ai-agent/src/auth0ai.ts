import { Auth0AI } from "@auth0/ai-vercel";
import { AuthorizeResponse } from "@auth0/ai/CIBA";

import { db } from "./db";

const auth0AI = new Auth0AI();

export const withCIBA = auth0AI.withCIBA({
  userID: (params: { userID: string }, ctx) => params.userID,
  bindingMessage: "Confirm the purchase",
  scope: "openid stock:trade",
  audience: "http://localhost:8081",
  getAuthorizationResponse: async ({ tradeID }: { tradeID: string }) => {
    const v = await db.get(`auth_response:${tradeID}`);
    return v ? (JSON.parse(v) as AuthorizeResponse) : undefined;
  },
  storeAuthorizationResponse: async (
    response: AuthorizeResponse,
    { tradeID }: { tradeID: string }
  ) => {
    await db.set(`auth_response:${tradeID}`, JSON.stringify(response));
  },
});
