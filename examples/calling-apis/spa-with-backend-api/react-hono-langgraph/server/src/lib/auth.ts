import { SUBJECT_TOKEN_TYPES } from "@auth0/ai";
import { Auth0AI } from "@auth0/ai-langchain";

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

// Enhanced federated connection setup with access token support
// This demonstrates the new API pattern where access tokens can be used directly
export const withGoogleCalendar: ToolWrapper = auth0AI.withTokenForConnection({
  // Use the dedicated accessToken parameter & subjectTokenType for federated token exchange
  accessToken: async () => {
    if (!global.authContext?.accessToken) {
      throw new Error("Access token not available in auth context");
    }
    // This access token will be exchanged for a Google Calendar access token
    return global.authContext.accessToken;
  },
  refreshToken: undefined, // Explicitly override LangGraph's default refreshToken to avoid conflict
  subjectTokenType: SUBJECT_TOKEN_TYPES.SUBJECT_TYPE_ACCESS_TOKEN,
  connection: process.env.GOOGLE_CONNECTION_NAME || "google-oauth2",
  scopes: [
    "https://www.googleapis.com/auth/calendar", // Full calendar access (includes read/write)
    "https://www.googleapis.com/auth/calendar.events.readonly", // Explicit events read access
  ],
});
