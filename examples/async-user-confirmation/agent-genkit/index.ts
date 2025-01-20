import "dotenv/config";

import { genkit, z } from "genkit";
import { gpt4o, openAI } from "genkitx-openai";

import { Auth0AI, CIBAAuthorizer } from "@auth0/ai";

type ToolHandler = (input: { ticker: string; qty: number }) => Promise<string>;
interface AuthContext {
  userID: string;
}

const authorizer = new CIBAAuthorizer({
  domain: process.env["DOMAIN"]!,
  clientId: process.env["CLIENT_ID"]!,
  clientSecret: process.env["CLIENT_SECRET"]!,
  authorizationURL: `https://${process.env["DOMAIN"]}/bc-authorize`,
  tokenURL: `https://${process.env["DOMAIN"]}/oauth/token`,
});
const withAuth = Auth0AI.initialize<ToolHandler>(authorizer);

const ai = genkit({
  plugins: [openAI({ apiKey: process.env.OPENAI_API_KEY })],
  model: gpt4o,
});

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
  await withAuth(
    {
      user: "google-oauth2|114615802253716134337",
      scope: "openid",
      audience: process.env["AUDIENCE"]!,
    },
    (accessToken: string) =>
      async ({ ticker, qty }) => {
        const headers = {
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

        console.log(response.status);

        return "OK";
      }
  )
);

async function main() {
  try {
    const session = ai.createSession<AuthContext>({});
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
