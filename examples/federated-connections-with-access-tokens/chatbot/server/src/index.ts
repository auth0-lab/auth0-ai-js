import { createDataStreamResponse, generateId, streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { decodeJwt } from "jose";

import { openai } from "@ai-sdk/openai";
import { setAIContext } from "@auth0/ai-vercel";
import {
  errorSerializer,
  withInterruptions,
} from "@auth0/ai-vercel/interrupts";

import { listNearbyEvents } from "./lib/tools/listNearbyEvents";
import { listUserCalendars } from "./lib/tools/listUserCalendars";
import { jwtAuthMiddleware } from "./middleware/auth";

import type { ApiResponse } from "shared/dist";

const getAllowedOrigins = (): string[] => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  if (!allowedOrigins) {
    // Fallback to default origins if not set
    return ["http://localhost:5173", "http://localhost:3000"];
  }
  return allowedOrigins.split(",").map((origin) => origin.trim());
};

export const app = new Hono()

  .use(
    cors({
      origin: getAllowedOrigins(),
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

    const { messages: requestMessages } = await c.req.json();

    // Generate a thread ID for this conversation
    const threadID = generateId();

    // Set global auth context for tools to access
    global.authContext = {
      userSub: user.sub,
      accessToken,
    };

    // Set AI context for the tools to access
    setAIContext({ threadID });

    // Use the messages from the request directly
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
            messages: requestMessages,
            maxSteps: 5,
            tools,
          });

          result.mergeIntoDataStream(dataStream, {
            sendReasoning: true,
          });
        },
        { messages: requestMessages, tools }
      ),
      onError: errorSerializer((err) => {
        if (err instanceof Error) {
          // Check if this is a federated connection interrupt
          if (
            err.message.includes(
              "Authorization required to access the Federated Connection"
            )
          ) {
            console.log(
              "Detected federated connection interrupt - manually formatting"
            );

            // Manually create the interrupt format expected by the client
            const interruptData = {
              behavior: "resume",
              connection: "google-oauth2",
              scopes: [
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/calendar.events.readonly",
              ],
              requiredScopes: [
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/calendar.events.readonly",
              ],
              code: "FEDERATED_CONNECTION_ERROR",
              toolCall: { id: "unknown" }, // We might need to extract this from the tool context
            };

            return `AUTH0_AI_INTERRUPTION:${JSON.stringify(interruptData)}`;
          }
        }

        return "Oops, an error occurred!";
      }),
    });
  });
export default app;
