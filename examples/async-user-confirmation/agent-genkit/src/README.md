```typescript
import "dotenv/config";

import { genkit, z } from "genkit";
import { gpt4o, openAI } from "genkitx-openai";

import {
  Auth0AI,
  AuthContext,
  CIBAAuthorizer,
  DeviceAuthorizer,
} from "@auth0/ai";

const ai = genkit({
  plugins: [openAI({ apiKey: process.env.OPENAI_API_KEY })],
  model: gpt4o,
});

// const a0 = Auth0AI({
//   authorizers: [
//     new DeviceAuthorizer(),
//     new CIBAAuthorizer(),
//     new NextJsRedirectAuthorizer(),
//     new FGAAuthorizer(),
//   ],
// });

// global
const ciba = CIBAAuthorizer.initialize({ clientId: "xxx" });
const fga = FGAAuthorizer.initialize();

const oidc = new OIDCNextJsAuthorizer();

// usePopupAuthorizer
const useRedirect = oidc({
  redirectUrl: "xxxx", // para el popup de success
  provider: {
    name: "google",
    scope: "calendar-read",
    connectionName: "google-oauth2",
  },
  scope: "openid",
  audience: process.env["AUDIENCE"]!,

  // The components we show in case of not having the required credentials for requesting a Google (provider) Token
  promptComponent: async ({ onAuthorize }) => {
    // esperando a que se ejecute el popup -> waiting component (waiting for the popup to be executed)
    return "<button click={onAuthorize}>Click here to authorize Market0 to get access to your google calendar</button>";
  },
});

// per tool
const useFGA = fga({
  // (userId: string , { qty, ticker }) => {} || ({ qty, ticker }) => {}
  buildQuery: async (userId: string, { qty, ticker }) => {
    // get userID
    return {
      object: "",
      relation: "",
      user: "",
    };
  },
});

const useCIBA = ciba({
  authorizer: "ciba-authorizer",
  userId: "google-oauth2|114615802253716134337", // string or () => Promise<string>
  // binding_message: "Buy 100 shares of ZEKO",
  binding_message: async ({ qty, ticker }) => `Buy ${qty} shares of ${ticker}`,
  scope: "openid",
  audience: process.env["AUDIENCE"]!,
});

const authPipeline = (toolHandler: any) => useCIBA(useFGA(toolHandler));

const buy = ai.defineTool(
  {
    name: "buy",
    description: "Use this function to buy stock",
    inputSchema: z.object({
      ticker: z.string(),
      qty: z.number(),
    }),
    outputSchema: z.string(),
  },
  authPipeline(async ({ accessToken, claims }, { ticker, qty }) => {
    const headers = {
      Authorization: "",
      "Content-Type": "application/json",
    };
    const body = {
      ticker: ticker,
      qty: qty,
    };

    if (accessToken) {
      headers["Authorization"] = "Bearer " + accessToken;
    }

    const response = await fetch(process.env["API_URL"]!, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    return response.statusText;
  })
);

type MyContext = { userName?: string } & AuthContext;

async function main() {
  try {
    const session = ai.createSession<MyContext>({
      initialState: {
        userId: "google-oauth2|114615802253716134337",
        userName: "John",
      },
    });
    const chat = session.chat();
    const { text } = await chat.send({
      prompt: "Buy 100 shares of ZEKO",
      tools: [buy],
    });

    console.log(text);
  } catch (error) {
    console.log("AGENT:error", error);
  }
}

main().catch(console.error);
```
