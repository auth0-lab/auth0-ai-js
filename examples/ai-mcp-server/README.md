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

## Run against a real tenant

`npm run smoke:real` starts the downstream API and the MCP server on loopback, signs a test user in against your tenant, connects an MCP client over Streamable HTTP with that user's access token, lists the tools and calls both. The downstream API checks the exchanged token against the tenant's JWKS (signature, issuer, audience, expiry, scope), so a passing run shows that a real on-behalf-of token arrived.

### Tenant prerequisites

- An API for the MCP server. Its identifier is `MCP_SERVER_URL`. Define the scope you use for `MCP_ADMIN_SCOPE`, and give the test user's token that scope.
- An API for the downstream service. Its identifier is `DOWNSTREAM_AUDIENCE`. Define the scope used for `DOWNSTREAM_SCOPE` and `DOWNSTREAM_REQUIRED_SCOPE`.
- A custom API client for the MCP server API, with the on-behalf-of token exchange profile type allowed. Its id and secret go in `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`.
- A client grant that lets that client request the downstream API and scope, with the subject type set to user.
- A test user in a database connection, and a login client that the password grant is enabled for (the password-realm grant if you set `SMOKE_REALM`). The login client needs no grant of its own.

The smoke test uses the Resource Owner Password grant to get the user token. That grant is for local testing only. Production clients should sign users in with the authorization code flow and PKCE.

### Configure and run

```sh
cp .env.example .env   # fill in every value, including the SMOKE_* ones
npm run smoke:real
```

`.env` is ignored by git. Keep real values out of any file that is committed.

### Expected output

```
PASS  servers started  (mcp port 52006, downstream port 52005)
PASS  user token issued  (length 734, claims aud,azp,exp,gty,iat,iss,scope,sub)
PASS  mcp client connected
PASS  tools listed  (admin_summary,list_reports)
PASS  list_reports returned data fetched with an exchanged token  (2 reports)
PASS  admin_summary allowed for the caller  (ok)

6/6 checks passed
```

The ports and the token length vary. The script prints no token or secret values, and exits with a non-zero status if any check fails. It always shuts both servers down.

## Check

```sh
npm run type-check
npm run lint
npm run build
npm test
```

The example needs `@modelcontextprotocol/sdk` 1.31 or newer, and `npm test` fails if the resolved copy is older. If a hoisted older copy wins, install a newer one next to the example without saving. Create a scratch directory outside the repository and run the install there, then copy the result in:

```sh
SCRATCH="$(mktemp -d)"
cd "$SCRATCH" && echo '{"name":"scratch","private":true}' > package.json
npm install --no-save --no-package-lock --ignore-scripts @modelcontextprotocol/sdk@1.32.1
cd - && mkdir -p examples/ai-mcp-server/node_modules
cp -R "$SCRATCH/node_modules/." examples/ai-mcp-server/node_modules/
```

Any version at or above 1.31 works. The copy also brings the SDK's transitive dependencies. A clean checkout fails this test until the root dependency resolves 1.31 or later.

`npm test` runs both servers on loopback with a mocked Auth0 tenant. It makes no network calls.
