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

const a0 = Auth0AI({
  authorizers: [new DeviceAuthorizer(), new CIBAAuthorizer()],
});

const useCIBAAuthorizer = a0.authorizeWith({
  authorizer: "ciba-authorizer",
  userId: "google-oauth2|114615802253716134337",
  binding_message: "Buy 100 shares of ZEKO",
  scope: "openid",
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
  useCIBAAuthorizer(async (accessToken, { ticker, qty }) => {
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
