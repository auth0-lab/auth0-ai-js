import "dotenv/config";

import { Hono } from "hono";
import { cors } from "hono/cors";

import { FederatedConnectionInterrupt } from "@auth0/ai/interrupts";
import { serve } from "@hono/node-server";
import { HumanMessage } from "@langchain/core/messages";

import { INTERRUPTION_PREFIX, isChatRequest } from "../../shared/src";
import { createGraph } from "./lib/agent";
import { jwtAuthMiddleware } from "./middleware/auth";

import type {
  ApiResponse,
  StreamChunk,
  Auth0InterruptData,
  SSEData,
} from "../../shared/src";

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
    return c.text("Hello Hono with LangGraph!");
  })

  .get("/hello", async (c) => {
    const data: ApiResponse = {
      message: "Hello from LangGraph SPA!",
      success: true,
    };
    console.log("✅ Success! Public /hello route called!");
    return c.json(data, { status: 200 });
  })

  // Protected API route
  .get("/api/external", jwtAuthMiddleware(), async (c) => {
    const auth = c.get("auth");

    const data: ApiResponse = {
      message: `Your access token was successfully validated! Welcome ${auth?.jwtPayload.sub}`,
      success: true,
    };

    return c.json(data, { status: 200 });
  })

  .post("/chat", jwtAuthMiddleware(), async (c) => {
    const auth = c.get("auth");
    const accessToken = c.get("auth")?.token;

    console.log("🔐 Authenticated user:", auth?.jwtPayload.sub);

    if (!accessToken) {
      return c.json({ error: "Access token not available" }, 401);
    }

    // Create graph with auth context
    const graph = createGraph(c);

    let requestBody: unknown;
    try {
      requestBody = await c.req.json();
    } catch (error) {
      return c.json({ error: "Invalid JSON in request body" }, 400);
    }

    // Type guard for chat request using shared utility
    if (!isChatRequest(requestBody)) {
      return c.json({ error: "Invalid messages format" }, 400);
    }

    const { messages } = requestBody;

    try {
      // Convert messages to LangChain format
      const langchainMessages = messages.map(
        (msg) => new HumanMessage(msg.content)
      );

      // Generate a unique thread/config ID
      const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const config = {
        configurable: {
          thread_id: threadId,
        },
      };

      // Stream the response using LangGraph
      const stream = await graph.stream(
        { messages: langchainMessages },
        { ...config, streamMode: "updates" }
      );

      // Set up SSE headers
      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("Connection", "keep-alive");

      // Create a readable stream with proper error handling
      const readable = new ReadableStream({
        async start(controller) {
          const encodeSSE = (data: string): Uint8Array => {
            return new TextEncoder().encode(`data: ${data}\n\n`);
          };

          const sendInterrupt = (interruptData: Auth0InterruptData): void => {
            const errorData = `${INTERRUPTION_PREFIX}${JSON.stringify(interruptData)}`;
            controller.enqueue(encodeSSE(errorData));
            controller.close();
          };

          const sendError = (error: string): void => {
            const errorData: SSEData = {
              type: "error",
              error,
            };
            controller.enqueue(encodeSSE(JSON.stringify(errorData)));
            controller.close();
          };

          const sendContent = (content: string): void => {
            const data: SSEData = {
              type: "content",
              content,
              role: "assistant",
            };
            controller.enqueue(encodeSSE(JSON.stringify(data)));
          };

          try {
            for await (const chunk of stream) {
              const typedChunk = chunk as StreamChunk;

              if (
                typedChunk.__interrupt__ &&
                Array.isArray(typedChunk.__interrupt__)
              ) {
                for (const interrupt of typedChunk.__interrupt__) {
                  let interruptValue: unknown;
                  interruptValue = (interrupt as any).value;

                  if (
                    interruptValue &&
                    FederatedConnectionInterrupt.isInterrupt(interruptValue)
                  ) {
                    // Cast to FederatedConnectionInterrupt since isInterrupt() confirms it's the correct type
                    const federatedInterrupt =
                      interruptValue as FederatedConnectionInterrupt;

                    const interruptData: Auth0InterruptData =
                      federatedInterrupt.toJSON();

                    sendInterrupt(interruptData);
                    return;
                  }
                }
              }

              // Handle "updates" mode - check for callLLM updates
              let lastMessage: any = null;
              if (typedChunk.callLLM?.messages) {
                const messages = typedChunk.callLLM.messages;
                lastMessage = messages[messages.length - 1];
              }

              if (lastMessage && lastMessage.content) {
                sendContent(lastMessage.content);
              }
            }

            // Send final message
            controller.enqueue(encodeSSE("[DONE]"));
            controller.close();
          } catch (error) {
            console.error("❌ Error in LangGraph stream:", error);
            sendError("An error occurred processing your request");
          }
        },
      });

      return new Response(readable);
    } catch (error) {
      console.error("❌ Error in chat endpoint:", error);
      return c.json(
        { error: "An error occurred processing your request" },
        500
      );
    }
  });

// Start the server for Node.js
const port = Number(process.env.PORT) || 3000;

console.log(`🚀 Server starting on port ${port}`);
serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server running on http://localhost:${port}`);
