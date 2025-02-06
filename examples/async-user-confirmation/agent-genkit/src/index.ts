import "dotenv/config";

import { genkit, z } from "genkit";
import { gpt4o, openAI } from "genkitx-openai";

import { AccessDeniedError, CIBAAuthorizer, DeviceAuthorizer } from "@auth0/ai";

type MyContext = { userId: string };

const ai = genkit({
  plugins: [openAI({ apiKey: process.env.OPENAI_API_KEY })],
  model: gpt4o,
});

const ciba = CIBAAuthorizer.create();

const useCiba = ciba({
  userId: async () => {
    const data = ai.currentSession<MyContext>();
    return data.state?.userId!;
  },
  binding_message: async ({ ticker, qty }) =>
    `Do you want to buy ${qty} shares of ${ticker}`,
  scope: "openid buy:stocks",
  audience: process.env["AUDIENCE"]!,
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
  useCiba(
    async ({ accessToken }, { ticker, qty }) => {
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
    },
    async (error: Error) => {
      if (error instanceof AccessDeniedError) {
        return "The user has denied the request";
      }

      return "Oops! Something went wrong.";
    }
  )
);

async function main() {
  try {
    const response = await DeviceAuthorizer.authorize(
      {
        scope: "openid",
      },
      {
        clientId: process.env["AUTH0_PUBLIC_CLIENT_ID"]!,
      }
    );
    const session = ai.createSession<MyContext>({
      initialState: {
        userId: response.claims?.sub!,
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
