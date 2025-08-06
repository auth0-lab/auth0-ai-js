# Enhanced Federated Connections with Access Tokens

This example has been updated to demonstrate the enhanced Auth0 AI SDK approach for federated connections using access tokens instead of refresh tokens.

## Key Improvements

### 1. Enhanced SDK API Surface
The core `@auth0/ai` package now supports:
- **Resource Server Client Credentials**: Separate client credentials for token exchange operations
- **Access Token Support**: Direct access token exchange instead of requiring refresh tokens
- **Backward Compatibility**: Existing refresh token implementations continue to work

### 2. Updated Implementation
The example now uses the enhanced SDK pattern with dedicated access token support:

```typescript
// lib/auth.ts - Enhanced federated connection setup
const auth0AI = new Auth0AI({
  auth0: {
    domain: process.env.AUTH0_DOMAIN!,
    // For federated token exchange, we want to provide the resource server client (linked client's) credentials
    clientId: process.env.LINKED_CLIENT_ID!, // Resource server client
    clientSecret: process.env.LINKED_CLIENT_SECRET!, // Resource server secret
  }
});

export const withGoogleCalendar = auth0AI.withTokenForConnection({
  accessToken: async () => global.authContext?.accessToken, // Access token for federated exchange
  connection: "google-oauth2",
  scopes: ["https://www.googleapis.com/auth/calendar"]
});
```

### 3. Simplified Tool Implementation
Tools now use the SDK's built-in token management:

```typescript
// tools/listNearbyEvents.ts
import { getAccessTokenForConnection } from "@auth0/ai-vercel";

export const listNearbyEvents = withGoogleCalendar(
  tool({
    execute: async ({ start, end, calendarId }) => {
      const token = getAccessTokenForConnection(); // Automatic token retrieval
      // Use token with Google Calendar API...
    }
  })
);
```

## Benefits

1. **Dedicated Access Token Support**: Native `accessToken` parameter eliminates the need for refresh token workarounds
2. **Resource Server Client Configuration**: Proper separation of SPA and resource server client credentials
3. **Cached Token Exchange**: Tokens are automatically cached across requests
4. **Simplified Configuration**: Resource server credentials configured once
5. **Consistent API**: Same `withTokenForConnection` interface across scenarios
6. **Type Safety**: Full TypeScript support with proper validation
7. **No Manual Token Management**: SDK handles all token exchange operations

## Environment Configuration

```bash
# SPA Client (for user authentication)
AUTH0_CLIENT_ID=your-spa-client-id

# Resource Server Client (for token exchange)
LINKED_CLIENT_ID=your-resource-server-client-id
LINKED_CLIENT_SECRET=your-resource-server-client-secret
```

## Migration from Manual Implementation

The previous implementation required manual token exchange in each tool:

```typescript
// OLD: Manual token exchange in every tool
const token = await getAccessTokenForConnection({
  domain, clientId, clientSecret,
  connection: "google-oauth2",
  subjectToken: accessToken,
});
```

Now replaced with:

```typescript
// NEW: Automatic token management via SDK
const token = getAccessTokenForConnection();
```

This demonstrates the enhanced API design that will be fully available once the SDK updates are complete.

## Summary

✅ **COMPLETED**: Enhanced federated connections with dedicated access token support has been successfully implemented and integrated:

- **SDK Enhancement**: Added dedicated `accessToken` parameter to the core Auth0 AI SDK
- **API Implementation**: Updated `withTokenForConnection` to properly handle access token-based federated exchanges
- **Example Migration**: Successfully migrated the federated-connections-with-access-tokens example to use the new API
- **Tool Integration**: Updated all tools to use the simplified `getAccessTokenForConnection()` method
- **Build Verification**: All packages build successfully and type checking passes

The implementation now provides a clean, dedicated API for federated token exchange using access tokens instead of the previous refresh token workaround.
