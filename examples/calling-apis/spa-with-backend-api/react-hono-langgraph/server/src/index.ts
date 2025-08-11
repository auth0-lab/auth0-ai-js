import "dotenv/config";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { decodeJwt } from "jose";
import { serve } from "@hono/node-server";

import { HumanMessage } from "@langchain/core/messages";

import { graph } from "./lib/agent";
import { jwtAuthMiddleware } from "./middleware/auth";

import type { ApiResponse } from "../../shared/src";

// Global auth context for tools
declare global {
  var authContext: {
    userSub: string;
    accessToken: string;
  } | undefined;
}

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

    const { messages } = await c.req.json();

    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: "Invalid messages format" }, 400);
    }

    // Set global auth context for tools to access
    global.authContext = {
      userSub: user.sub,
      accessToken,
    };

    try {
      // Convert messages to LangChain format
      const langchainMessages = messages.map((msg: any) => {
        if (msg.role === "user") {
          return new HumanMessage(msg.content);
        }
        // Add other message types as needed
        return new HumanMessage(msg.content);
      });

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
        { ...config, streamMode: "values" }
      );

      // Set up SSE headers
      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("Connection", "keep-alive");

      // Create a readable stream
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const lastMessage = chunk.messages[chunk.messages.length - 1];
              
              if (lastMessage && lastMessage.content) {
                const data = JSON.stringify({
                  type: "content",
                  content: lastMessage.content,
                  role: "assistant",
                });
                
                controller.enqueue(`data: ${data}\n\n`);
              }
            }

            // Send final message
            controller.enqueue("data: [DONE]\n\n");
            controller.close();
          } catch (error) {
            console.error("❌ Error in LangGraph stream:", error);
            const errorData = JSON.stringify({
              type: "error",
              error: "An error occurred processing your request",
            });
            controller.enqueue(`data: ${errorData}\n\n`);
            controller.close();
          }
        },
      });

      return new Response(readable);
    } catch (error) {
      console.error("❌ Error in chat endpoint:", error);
      return c.json({ error: "An error occurred processing your request" }, 500);
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
