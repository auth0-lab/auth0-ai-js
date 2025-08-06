import { Auth0AI } from "@auth0/ai-vercel";

import type { ToolWrapper } from "@auth0/ai-vercel";
// Create an Auth0AI instance configured with enhanced resource server client support
// NOTE: This demonstrates the enhanced API approach using resource server client credentials
const auth0AI = new Auth0AI({
  auth0: {
    domain: process.env.AUTH0_DOMAIN!,
    // For federated token exchange, we only need the resource server credentials
    resourceServerClientId: process.env.LINKED_CLIENT_ID!, // Resource server client ID for token exchange
    resourceServerClientSecret: process.env.LINKED_CLIENT_SECRET!, // Resource server client secret
  },
});

// Enhanced federated connection setup with access token support
// This demonstrates the new API pattern where access tokens can be used directly
export const withGoogleCalendar: ToolWrapper = auth0AI.withTokenForConnection({
  // Use the dedicated accessToken parameter for federated token exchange
  accessToken: async () => {
    if (!global.authContext?.accessToken) {
      throw new Error("Access token not available in auth context");
    }
    // This access token will be exchanged for a Google Calendar access token
    return global.authContext.accessToken;
  },
  connection: "google-oauth2",
  scopes: [
    "https://www.googleapis.com/auth/calendar", // Full calendar access (includes read/write)
    "https://www.googleapis.com/auth/calendar.events.readonly", // Explicit events read access
  ],
});
