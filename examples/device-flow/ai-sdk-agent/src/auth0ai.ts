import { RedisStore } from "@auth0/ai-redis";
import { Auth0AI } from "@auth0/ai-vercel";

const auth0AI = new Auth0AI({
  store: new RedisStore(),
});

export const withAsyncUserConfirmation = auth0AI.withAsyncUserConfirmation({
  userID: (params: { userID: string }) => params.userID,
  bindingMessage: "Confirm the purchase",
  scopes: ["openid", "stock:trade"],
  audience: "http://localhost:8081",
});
