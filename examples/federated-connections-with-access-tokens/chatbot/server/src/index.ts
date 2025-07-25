import { createDataStreamResponse, generateId, streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { decodeJwt } from "jose";

import { openai } from "@ai-sdk/openai";
import {
  errorSerializer,
  withInterruptions,
} from "@auth0/ai-vercel/interrupts";

import { listNearbyEvents } from "./lib/tools/listNearbyEvents";
import { listUserCalendars } from "./lib/tools/listUserCalendars";
import { jwtAuthMiddleware } from "./middleware/auth";

import type { ApiResponse } from "shared/dist";

export const app = new Hono()

  .use(
    cors({
      origin: ["http://localhost:5173", "http://localhost:3000"],
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  )

  .get("/", (c) => {
    return c.text("Hello Hono!");
  })

  .get("/hello", async (c) => {
    const data: ApiResponse = {
      message: "Hello BHVR!",
      success: true,
    };
    console.log("✅ Success! Public /hello route called!");
    return c.json(data, { status: 200 });
  })

  // Protected API route
  .get("/api/external", jwtAuthMiddleware(), async (c) => {
    const user = c.get("user");

    // Extract and log the access token
    const authHeader = c.req.header("authorization");
    const accessToken = authHeader?.replace("Bearer ", "");
    // console.log("🔑 Access Token:", accessToken);

    // Decode and log the JWT payload
    if (accessToken) {
      try {
        const decodedJwt = decodeJwt(accessToken);
        console.log("🔓 Decoded JWT:", JSON.stringify(decodedJwt, null, 2));
      } catch (error) {
        console.error("❌ Error decoding JWT:", error);
      }
    }

    const data: ApiResponse = {
      message: `Your access token was successfully validated! Welcome ${user.sub}`,
      success: true,
    };

    return c.json(data, { status: 200 });
  })

  .post("/chat", jwtAuthMiddleware(), async (c) => {
    const user = c.get("user");
    console.log("🔐 Authenticated user:", user.sub);

    // Extract the access token
    const authHeader = c.req.header("authorization");
    const accessToken = authHeader?.replace("Bearer ", "");
    
    if (!accessToken) {
      return c.json({ error: "No access token provided" }, 401);
    }

    const { prompt } = await c.req.json();

    // Set global auth context for tools to access
    global.authContext = {
      userSub: user.sub,
      accessToken,
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.LINKED_CLIENT_ID!,
      clientSecret: process.env.LINKED_CLIENT_SECRET!,
    };

    // Convert single prompt to messages format
    const messages = [
      {
        id: generateId(),
        role: "user" as const,
        content: prompt,
      },
    ];

    const tools = { listNearbyEvents, listUserCalendars };

    // note: you can see more examples of Hono API consumption with AI SDK here:
    // https://ai-sdk.dev/cookbook/api-servers/hono?utm_source=chatgpt.com#hono

    return createDataStreamResponse({
      execute: withInterruptions(
        async (dataStream) => {
          const result = streamText({
            model: openai("gpt-4o-mini"),
            system:
              "You are a helpful calendar assistant! You can help users with their calendar events and schedules. Keep your responses concise and helpful.",
            messages,
            maxSteps: 5,
            tools,
          });

          result.mergeIntoDataStream(dataStream, {
            sendReasoning: true,
          });
        },
        { messages, tools }
      ),
      onError: errorSerializer((err) => {
        console.log(err);
        return "Oops, an error occured!";
      }),
    });
  });
export default app;
