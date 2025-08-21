// server/index.ts
import "dotenv/config";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { decodeJwt } from "jose";

import { serve } from "@hono/node-server";
import { BaseMessage } from "@langchain/core/messages";

import { graph } from "./lib/agent";
import { jwtAuthMiddleware } from "./middleware/auth";

import type { ApiResponse, StreamChunk } from "shared";
// Local types for the server
interface StreamRequest {
  input?: {
    messages?: any[];
  };
}

// Simple in-memory storage for demo purposes
const threadStore = new Map<string, BaseMessage[]>();
const interruptStore = new Map<string, any>(); // Store interrupted thread states

const getAllowedOrigins = (): string[] =>
  process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? [
    "http://localhost:3000",
    "http://localhost:5173",
  ];

declare global {
  var authContext: { userSub: string; accessToken: string } | undefined;
}

const app = new Hono();

app.use(
  cors({
    origin: getAllowedOrigins(),
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/hello", async (c) => {
  const data: ApiResponse = {
    message: "Hi there! You've reached the public Hono /hello endpoint!",
    success: true,
  };
  console.log("✅ Success! Public /hello route called!");
  return c.json(data, { status: 200 });
});

app.get("/api/external", jwtAuthMiddleware(), async (c) => {
  const user = c.get("user");
  const token = c.req.header("authorization")?.replace("Bearer ", "");
  if (token) decodeJwt(token);
  return c.json({ message: `Authenticated as ${user.sub}`, success: true });
});

app.post("/api/langgraph/threads", jwtAuthMiddleware(), async (c) => {
  const threadId = `thread_${Date.now()}`;
  return c.json({
    thread_id: threadId,
    created_at: new Date().toISOString(),
    metadata: {},
    // Add status and interrupts for LangGraph SDK compatibility
    status: "idle",
    interrupts: {},
  });
});

// Add endpoint to get thread details (including interrupts)
app.get("/api/langgraph/threads/:threadId", jwtAuthMiddleware(), async (c) => {
  const threadId = c.req.param("threadId");
  console.log(`🔍 GET /api/langgraph/threads/${threadId}`);

  // Check if thread has interrupts
  const interruptData = interruptStore.get(threadId);
  const messages = threadStore.get(threadId) ?? [];

  console.log(`📝 Thread ${threadId} - interruptData:`, interruptData);

  // Format interrupts as expected by LangGraph SDK: dict[task_id, list[Interrupt]]
  const interrupts: Record<string, any[]> = {};
  let currentInterrupt = null;

  if (interruptData && interruptData.interrupts.length > 0) {
    const taskId = interruptData.run_id || "default_task";
    const formattedInterrupts = interruptData.interrupts.map(
      (interrupt: any) => ({
        value: interrupt.value,
        id: `interrupt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      })
    );
    interrupts[taskId] = formattedInterrupts;

    // Also set the current interrupt for the SDK
    currentInterrupt = formattedInterrupts[0];
    console.log(`🚨 Including interrupt in response:`, currentInterrupt);
  }

  const response: any = {
    thread_id: threadId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {},
    status: interruptData ? "interrupted" : "idle",
    values: { messages },
    interrupts,
  };

  // Include the current interrupt at the root level if present
  if (currentInterrupt) {
    response.interrupt = currentInterrupt;
  }

  console.log(`📤 Sending thread response:`, {
    ...response,
    messages: `[${messages.length} messages]`,
  });

  return c.json(response);
});

// Add endpoint to get current thread state (required by useStream hook)
app.get(
  "/api/langgraph/threads/:threadId/state",
  jwtAuthMiddleware(),
  async (c) => {
    const threadId = c.req.param("threadId");

    // Check if thread has interrupts
    const interruptData = interruptStore.get(threadId);
    const messages = threadStore.get(threadId) ?? [];

    // Return current state with interrupt information in LangGraph format
    const response = {
      values: { messages },
      checkpoint: {
        checkpoint_id: `checkpoint_${Date.now()}`,
        thread_id: threadId,
        thread_ts: new Date().toISOString(),
      },
      metadata: {},
      created_at: new Date().toISOString(),
      parent_checkpoint: null,
      tasks: [],
      // Include interrupt information if present in the format the SDK expects
      ...(interruptData && {
        interrupts: interruptData.interrupts.map((interrupt: any) => ({
          value: interrupt.value,
          id: `interrupt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        })),
        status: "interrupted",
      }),
    };

    return c.json(response);
  }
);

app.post(
  "/api/langgraph/threads/:threadId/history",
  jwtAuthMiddleware(),
  async (c) => {
    const threadId = c.req.param("threadId");
    const { limit = 1000 } = await c.req.json();
    const messages = threadStore.get(threadId) ?? [];

    // Return in the format expected by LangGraph SDK (thread states, not just messages)
    const threadStates =
      messages.length > 0
        ? [
            {
              values: { messages },
              checkpoint: {
                checkpoint_id: `checkpoint_${Date.now()}`,
                thread_id: threadId,
                thread_ts: new Date().toISOString(),
              },
              metadata: {},
              created_at: new Date().toISOString(),
              parent_checkpoint: null,
              tasks: [],
            },
          ]
        : [];

    return c.json(threadStates.slice(-limit));
  }
);

app.post(
  "/api/langgraph/threads/:threadId/runs/stream",
  jwtAuthMiddleware(),
  async (c) => {
    const user = c.get("user");
    const token = c.req.header("authorization")?.replace("Bearer ", "");
    const threadId = c.req.param("threadId");
    const body = await c.req.json<StreamRequest>();

    const inputMessages = Array.isArray(body.input?.messages)
      ? body.input.messages
      : [];

    global.authContext = { userSub: user.sub, accessToken: token! };

    // Check if this is a resume scenario (null input or empty messages with existing interrupt)
    const hasInterrupt = interruptStore.has(threadId);
    const isResume =
      (body.input === null || inputMessages.length === 0) && hasInterrupt;

    return streamSSE(c, async (stream) => {
      const runId = `run_${Date.now()}`;
      await stream.writeSSE({
        event: "metadata",
        data: JSON.stringify({ run_id: runId }),
      });

      try {
        // Check if this is a resume scenario before we delete the interrupt
        const hasInterruptBeforeDelete = interruptStore.has(threadId);
        const isResume = inputMessages.length === 0 && hasInterruptBeforeDelete;

        // If this is a resume (no new messages), clear any existing interrupts
        if (isResume) {
          console.log(`🔄 Resuming interrupted thread ${threadId}`);
          interruptStore.delete(threadId);
        }

        // For resume scenarios, use null input to continue from where we left off
        const streamInput = isResume
          ? null // Resume: continue from interrupted state
          : { messages: inputMessages as any }; // New messages: start new conversation or add to existing

        console.log(`🚀 Starting graph stream with input:`, streamInput);

        const streamIterator = await graph.stream(streamInput, {
          configurable: {
            access_token: token,
            user_id: user.sub,
            thread_id: threadId,
          },
          streamMode: "values",
        });

        for await (const chunk of streamIterator) {
          const typedChunk = chunk as StreamChunk;

          // Check for interrupts and handle them in the proper LangGraph protocol
          if (
            typedChunk.__interrupt__ &&
            Array.isArray(typedChunk.__interrupt__)
          ) {
            console.log(
              "🛑 Interrupt detected in stream chunk:",
              typedChunk.__interrupt__
            );

            // Store the interrupt state for the thread (for state API)
            interruptStore.set(threadId, {
              run_id: runId,
              interrupts: typedChunk.__interrupt__,
            });

            // Send interrupt in the exact format that LangGraph SDK expects
            // typedChunk.__interrupt__ is a GraphInterrupt object containing interrupts array
            // We need to extract the first interrupt and format it for the SDK
            const interrupts =
              (typedChunk.__interrupt__ as any).interrupts ||
              (typedChunk.__interrupt__ as any);
            const firstInterrupt = Array.isArray(interrupts)
              ? interrupts[0]
              : interrupts;

            if (firstInterrupt) {
              const langgraphInterrupt = {
                value: firstInterrupt.value, // The Auth0Interrupt object
                id: `interrupt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              };

              await stream.writeSSE({
                event: "updates",
                data: JSON.stringify({
                  __interrupt__: langgraphInterrupt, // Send as single object, not array
                }),
              });
            }

            // End the stream
            await stream.writeSSE({
              event: "end",
              data: JSON.stringify({}),
            });
            return;
          }

          // Handle regular message chunks
          const messages: BaseMessage[] = (typedChunk.messages ??
            Object.values(typedChunk).flatMap(
              (n: any) => n.messages || []
            )) as BaseMessage[];

          if (messages.length > 0) {
            const existing = threadStore.get(threadId) ?? [];
            const newMessages = messages.filter(
              (msg: BaseMessage) =>
                !existing.some((m: BaseMessage) => m.id === msg.id)
            );

            if (newMessages.length > 0) {
              threadStore.set(threadId, [...existing, ...newMessages]);

              await stream.writeSSE({
                event: "messages",
                data: JSON.stringify(newMessages),
              });
            }
          }
        }

        await stream.writeSSE({
          event: "end",
          data: JSON.stringify({}),
        });
      } catch (error) {
        console.error("Stream error:", error);

        // For errors, send an error event
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({
            error: error instanceof Error ? error.message : "An error occurred",
          }),
        });

        await stream.writeSSE({
          event: "end",
          data: JSON.stringify({}),
        });
      }
    });
  }
);

// Add endpoint to resume interrupted threads
app.post(
  "/api/langgraph/threads/:threadId/runs/:runId/resume",
  jwtAuthMiddleware(),
  async (c) => {
    const threadId = c.req.param("threadId");
    const runId = c.req.param("runId");

    console.log(`🔄 Resuming thread ${threadId} from run ${runId}`);

    // Clear interrupts for this thread
    interruptStore.delete(threadId);

    // The actual resumption will happen when the next message is sent
    // This endpoint just clears the interrupt state
    return c.json({
      run_id: runId,
      thread_id: threadId,
      status: "completed",
    });
  }
);

const port = Number(process.env.PORT) || 3000;
console.log(`🚀 Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
