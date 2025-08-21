import { SUBJECT_TOKEN_TYPES } from "@auth0/ai";
import { Auth0AI } from "@auth0/ai-langchain";

import type { Context } from "hono";
import type { ToolWrapper } from "@auth0/ai-langchain";

// Create an Auth0AI instance configured with enhanced resource server client support
// NOTE: This demonstrates the enhanced API approach using resource server client credentials
const auth0AI = new Auth0AI({
  auth0: {
    domain: process.env.AUTH0_DOMAIN!,
    // For federated token exchange, we only need the resource server credentials
    clientId: process.env.RESOURCE_SERVER_CLIENT_ID!, // Resource server client ID for token exchange
    clientSecret: process.env.RESOURCE_SERVER_CLIENT_SECRET!, // Resource server client secret
  },
});

export const createGoogleCalendarTool = (c: Context): ToolWrapper => {
  const accessToken = c.get("auth")?.token;

  if (!accessToken) {
    throw new Error("Access token not available in auth context");
  }

  return auth0AI.withTokenForConnection({
    accessToken: async () => accessToken,
    subjectTokenType: SUBJECT_TOKEN_TYPES.SUBJECT_TYPE_ACCESS_TOKEN,
    connection: process.env.GOOGLE_CONNECTION_NAME || "google-oauth2",
    scopes: [
      "https://www.googleapis.com/auth/calendar", // Full calendar access (includes read/write)
      "https://www.googleapis.com/auth/calendar.events.readonly", // Explicit events read access
    ],
  });
};
