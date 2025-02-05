import "dotenv/config";

import { genkit, z } from "genkit";
import { gpt4o, openAI } from "genkitx-openai";

import {
  CIBAAuthorizer,
  DeviceAuthorizer,
  FGAAuthorizer,
  usePipeline,
} from "@auth0/ai";

const ai = genkit({
  plugins: [openAI({ apiKey: process.env.OPENAI_API_KEY })],
  model: gpt4o,
});

const ciba = CIBAAuthorizer.create();
const deviceFlow = DeviceAuthorizer.create();
const fga = FGAAuthorizer.create();

const useCiba = ciba({
  userId: async () => "google-oauth2|114615802253716134337",
  binding_message: "Buy 100 shares of ZEKO",
  scope: "openid",
  audience: process.env["AUDIENCE"]!,
});

const useDeviceFlow = deviceFlow({
  scope: "openid",
  audience: process.env["AUDIENCE"]!,
});

const useFga = fga({
  buildQuery: async ({ userId }) => {
    return {
      user: `user:${userId}`,
      object: "doc:1",
      relation: "can_view",
    };
  },
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
  usePipeline(
    [useDeviceFlow, useFga],
    async ({ accessToken, allowed, claims }, { ticker, qty }) => {
      console.log(allowed, claims);

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
    }
  )
);

type MyContext = { userName?: string };

async function main() {
  try {
    const session = ai.createSession<MyContext>({
      initialState: {
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
