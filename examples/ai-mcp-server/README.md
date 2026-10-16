# MCP server with Auth0 token delegation

A small MCP server built with `@auth0/ai-mcp` and the MCP TypeScript SDK. It checks the access token on every request, then calls a downstream API as the signed-in user through an on-behalf-of token exchange. A second small server plays the downstream API.

## What it shows

- `src/mcp-app.ts` wires `createNodeMcpHandler` to an `McpServer` over Streamable HTTP. Requests without a valid token are answered with a `WWW-Authenticate` challenge before any tool runs. The server also publishes its protected resource metadata (RFC 9728).
- `list_reports` exchanges the caller's token for a token to the downstream API with the request-scoped client, then calls the API with it. It sends only the exchanged token, whose audience is `DOWNSTREAM_AUDIENCE`, and never the caller's own token. Failures come back as a fixed error message, and the call stops after `DOWNSTREAM_TIMEOUT_MS`.
- `admin_summary` is wrapped in `withRequiredScopes`. A caller without the admin scope gets an error result for that tool only (HTTP 200); the rest of the server stays available.
- `src/downstream-api.ts` verifies every token it receives (signature from the tenant JWKS, issuer, audience, expiry and scope) before it returns data.

## Auth0 setup

Create these in your tenant:

1. An API for the MCP server. Its identifier is the public URL of the server (`MCP_SERVER_URL`). Add the scope you use for `MCP_ADMIN_SCOPE`.
2. An API for the downstream service, with the identifier you set as `DOWNSTREAM_AUDIENCE` and a scope matching `DOWNSTREAM_SCOPE`.
3. An application allowed to perform on-behalf-of token exchange for the downstream API. Its client id and secret go in `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`. Authorize it for the downstream API and its scope. Enabling on-behalf-of exchange on a tenant may require Auth0 support; see the Auth0 documentation for token exchange.
4. A client application that signs users in and requests an access token for the MCP server API.

## Run

```sh
cp .env.example .env   # fill in the values
npm run start:api      # downstream API
npm run start          # MCP server, in a second terminal
```

Point an MCP client at `MCP_SERVER_URL` and send the user's access token as a bearer token.

The `.env` file is read with Node's `--env-file` support, so no extra package is needed.

## Check

```sh
npm run type-check
npm run lint
npm run build
npm test
```

`npm test` runs both servers on loopback with a mocked Auth0 tenant. It makes no network calls.
