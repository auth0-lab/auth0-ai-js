import "dotenv/config";

import { genkit, z } from "genkit";
import { gpt4o, openAI } from "genkitx-openai";

import { AuthContext, PollingCIBAAuthorizer } from "@auth0/ai";
import { createAuthorizer } from "@auth0/ai-genkit";

type ToolHandler = (input: { ticker: string; qty: number }) => Promise<string>;

const ai = genkit({
  plugins: [openAI({ apiKey: process.env.OPENAI_API_KEY })],
  model: gpt4o,
});

const withAuth = createAuthorizer<ToolHandler>({
  genkit: ai,
  authorizer: new PollingCIBAAuthorizer(),
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
  withAuth(
    {
      scope: "openid",
      audience: process.env["AUDIENCE"]!,
    },
    async ({ ticker, qty }) => {
      const headers = {
        "Content-Type": "application/json",
      };
      const body = {
        ticker: ticker,
        qty: qty,
      };
      const session = ai.currentSession<AuthContext>();
      const accessToken = session.state?.accessToken;

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
