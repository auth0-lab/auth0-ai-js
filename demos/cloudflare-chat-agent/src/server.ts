import { createHash } from "node:crypto";
import { Hono } from "hono";
import { html } from "hono/html";
import {
  oidcAuthMiddleware,
  getAuth,
  processOAuthCallback,
  initOidcAuthMiddleware,
} from "@hono/oidc-auth";

import { FederatedConnectionChatAgent } from "@auth0/ai-cloudflare";
import {
  extendedOidcLoginHandler,
  extendedOidcLogoutHandler,
  baseOidcClaimsHook,
  federatedConnectionAgentMiddleware,
} from "@auth0/ai-cloudflare/hono";

import {
  createDataStreamResponse,
  streamText,
  type StreamTextOnFinishCallback,
} from "ai";
import { openai } from "@ai-sdk/openai";

import { errorSerializer, invokeTools } from "@auth0/ai-vercel/interrupts";
import { runWithAIContext, Auth0AI } from "@auth0/ai-vercel";

import { getWeather, checkUsersCalendar } from "./tools";

const model = openai("gpt-4o-mini");

/**
 * Chat Agent implementation that handles real-time AI chat interactions
 */
export class Chat extends FederatedConnectionChatAgent<Env> {
  /**
   * Handles incoming chat messages and manages the response stream
   * @param onFinish - Callback function executed when streaming completes
   */
  async onChatMessage(onFinish: StreamTextOnFinishCallback<{}>) {
    const auth0AI = new Auth0AI();

    const withTokenForGoogleConnection = auth0AI.withTokenForConnection({
      refreshToken: () => this.refreshToken,
      connection: "google-oauth2",
      scopes: ["https://www.googleapis.com/auth/calendar.freebusy"],
    });

    const checkUsersCalendarWithToken =
      withTokenForGoogleConnection(checkUsersCalendar);

    // Create a streaming response that handles both text and tool outputs
    return runWithAIContext({ threadID: this.name }, () => {
      return createDataStreamResponse({
        execute: async (dataStream) => {
          // Process any pending tool calls from previous messages
          // This handles human-in-the-loop confirmations for tools
          await invokeTools({
            messages: this.messages,
            tools: {
              checkUsersCalendar: checkUsersCalendarWithToken,
            },
          });

          // Stream the AI response using GPT-4
          const result = streamText({
            model,
            system: `You are a friendly assistant! Keep your responses concise and helpful. Today is ${new Date().toLocaleDateString()}.`,
            messages: this.messages,
            tools: {
              getWeather,
              checkUsersCalendar: checkUsersCalendarWithToken,
            },
            onFinish,
            maxSteps: 5,
          });

          // Merge the AI response stream with tool execution outputs
          result.mergeIntoDataStream(dataStream);
        },
        onError: errorSerializer((err) => {
          console.log(err);
          return "Oops, an error occured!";
        }),
      });
    });
  }
}

const app = new Hono<{ Bindings: Env }>();

app.use((c, next) =>
  initOidcAuthMiddleware({
    OIDC_ISSUER: "https://" + c.env.AUTH0_DOMAIN,
    OIDC_CLIENT_ID: c.env.AUTH0_CLIENT_ID,
    OIDC_CLIENT_SECRET: c.env.AUTH0_CLIENT_SECRET,
  })(c, next)
);

app.get("/login", extendedOidcLoginHandler);

app.get("/logout", (c) =>
  extendedOidcLogoutHandler(new URL("/", c.req.url))(c)
);

app.get("/callback", async (c) => {
  c.set("oidcClaimsHook", baseOidcClaimsHook);
  return processOAuthCallback(c);
});

app.get("/close", (c) =>
  c.html(
    html`<html>
      <head>
        <script>
          window.close();
        </script>
      </head>
      <body>
        You can now close this page
      </body>
    </html>`
  )
);

app.get("/", async (c) => {
  const userId = ((await getAuth(c))?.sub ?? "").toString();
  if (!userId) {
    return c.redirect("/login");
  }
  return c.redirect(`/agents/${userSlug(userId)}`);
});

app.use("/agents/*", oidcAuthMiddleware());

app.use("/agents/:userid/*", async (c, next) => {
  const userId = ((await getAuth(c))?.sub ?? "").toString();
  if (c.req.param("userid") !== userSlug(userId)) {
    return c.text("Unauthorized", 401);
  }
  return await next();
});

app.get("/agents/:userid", async (c) => {
  const res = await c.env.ASSETS.fetch(new URL("/", c.req.url));
  return new Response(res.body, res);
});

app.use("/agents/:userid/*", async (c, next) => {
  // Ensure users can only see their own sessions (agent IDs)

  const pathPieces = c.req.path.split("/");
  if (pathPieces[4] && pathPieces[4] !== c.req.param("userid")) {
    return c.text("Unauthorized", 401);
  }

  const res = await federatedConnectionAgentMiddleware({
    options: {
      prefix: `agents/${c.req.param("userid")}`,
    },
    // @ts-expect-error need to fix types on the middleware here
  })(c, next);

  return res && new Response(res.body, res);
});

app.use("*", async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw);
  return new Response(res.body, res);
});

export default app;

function userSlug(userId: string) {
  return createHash("sha256").update(userId).digest("base64url");
}
