import Enquirer from "enquirer";
import open from "open";

import { Auth0AI } from "@auth0/ai-llamaindex";
import { FSStore } from "@auth0/ai/stores";

const confirm = new Enquirer<{ answer: boolean }>();
// we use another the public client for this authorizer
export const useDeviceFlow = new Auth0AI({
  auth0: {
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_PUBLIC_CLIENT_ID!,
  },
  store: new FSStore(`${process.cwd()}/.store/device-flow.json`),
}).withDeviceAuthorizationFlow({
  scopes: ["openid"],
  audience: process.env.AUDIENCE!,
  onAuthorizationRequest: async (request) => {
    const { answer } = await confirm.prompt({
      type: "confirm",
      name: "answer",
      initial: true,
      message:
        "We need to authenticate you in a browser. Do you want to continue?",
    });
    if (!answer) {
      throw new Error("User denied the request");
    }
    await open(request.verificationUriComplete!);
  },
  onUnauthorized: async (e: Error) => {
    return e.message;
  },
});
