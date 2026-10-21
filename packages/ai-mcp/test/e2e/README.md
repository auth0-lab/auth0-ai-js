# Real-tenant end-to-end tests

These specs use no mocks. A real user access token (password-realm grant) goes through a real
`@modelcontextprotocol/sdk` client and `StreamableHTTPClientTransport` over HTTP on localhost into
the real `@auth0/ai-mcp` handler, which performs a real token exchange against an Auth0 tenant. A local
downstream API verifies the forwarded bearer against the tenant JWKS (issuer, audience and RS256
checked) and reports the verified claims.

## Gating

Every spec is `describe.skipIf(!e2e.enabled)`. The suite is enabled only when `AUTH0_E2E=1`.
With `AUTH0_E2E=1` and a required variable missing, the spec file fails and names the missing
variables (never their values). `npm test` never runs them, even with `AUTH0_E2E=1` exported: the default config excludes `*.e2e.spec.ts`, and `npm run test:e2e` uses `vitest.e2e.config.ts`.
No CI workflow sets `AUTH0_E2E`, so CI never runs them.

Run them with `npm run test:e2e` after exporting the variables below. Files run one at a time
(`fileParallelism: false`) so they do not hit the tenant token endpoint at once. To run a subset,
pass file name fragments to the runner script, for example `run-e2e.sh m2m obo-cache`.

## Pinned tenant behaviour

The specs that pin exact tenant status or error codes (`scope-probe`, `obo-errors`, `token-vault`)
document how the tenant behaves today. A failure there means re-observe the tenant first; it is not
necessarily a library regression.

## Rate limits

The tenant rate limits the password-realm and client credentials grants (429). Token helpers in
`support/tokens.ts` retry 429 and 5xx with bounded exponential backoff, honoring `Retry-After` and
`x-ratelimit-reset`, through one function, `postTokenRequest`. Minted user and client credentials
tokens are memoized per process by grant, client, audience, scope and organization; pass
`fresh: true` to mint a new one. Mint tokens in `beforeAll`, outside any fetch counter window, so
retries never move a count assertion.

## Environment

See `.env.e2e.example` for the full list. Required for every scenario: `AUTH0_E2E_DOMAIN`,
`AUTH0_E2E_MCP_AUDIENCE`, `AUTH0_E2E_DOWNSTREAM_AUDIENCE`, `AUTH0_E2E_OBO_CLIENT_ID` and `_SECRET`
(the client that performs the exchange), `AUTH0_E2E_LOGIN_CLIENT_ID` and `_SECRET` (the client that
mints the user token), `AUTH0_E2E_USERNAME`, `AUTH0_E2E_PASSWORD`, `AUTH0_E2E_REALM`.
Optional: `AUTH0_E2E_DOWNSTREAM_SCOPE` (default `work:read`), `AUTH0_E2E_M2M_CLIENT_ID` and `_SECRET`
and `AUTH0_E2E_ORG_ID` (scenarios that opt in with `M2M_VARS` / `ORG_VARS`), `AUTH0_E2E_EXPIRED_TOKEN`
(an already expired token for the MCP API; the expiry spec is skipped without it).

The tests only call the token endpoint and the JWKS and discovery documents. They make no
Management API calls and change nothing in the tenant.

## Support API (`test/e2e/support`)

- `loadE2eEnv(extra?)`: reads the contract; throws naming missing variables when enabled.
- `getUserToken(env, { audience?, scope?, fresh? })`: password-realm access token for the test user (memoized).
- `getClientCredentialsToken(env, { audience, scope?, organization?, clientId?, clientSecret?, fresh? })` (memoized).
- `postTokenRequest(env, form)`: raw token endpoint POST with retry; returns `{ status, body }`.
- `decodeClaims(token)`: unverified payload, for claim-name assertions only.
- `startDownstreamApi({ domain, audience })`: local verifier; `{ url, calls, close }`.
- `startMcpServer({ env, downstreamUrl, scopeMatching?, tokenStore?, requiredScopes?, organizationPolicy?, organizationId?, audience?, clientSecret?, dpop?, registerTools? })`: Node adapter (`createNodeMcpHandler`). Returns `{ url, htu, client, close }`. Tools: `whoami`, `delegate({ scope?, audience? })`, `service({ connection, loginHint? })` (Token Vault, returns `{ ok, hasToken, scopeGranted }`, never a token).
  - No `tokenStore` (or `tokenStore: null`) means no store: nothing is cached and only single-flight applies.
  - `clientSecret` overrides the exchange client secret. `dpop` is passed to the ingress client (`{ mode: "allowed" | "required" | "disabled" }`, default `allowed`).
  - `htu` is the URL the handler sees for the MCP endpoint (`<resource origin>/mcp`, the Node adapter and the bridge below rebuild requests on the resource origin). Use it as the `htu` of DPoP proofs.
- `startWebMcpServer(sameOptions)`: serves the web-standard `createMcpSdkHandler` through a thin bridge (message conversion only). Returns the same fields plus `handle(request)` (call the handler directly) and `metadataUrl` (local URL of the protected resource metadata route).
- `connectMcpClient(url, accessToken?)` and `callToolJson(client, name, args?)`: real SDK client.
- `postInitialize(url, authorization?)`: raw POST returning status and parsed `WWW-Authenticate`.
- `installFetchCounter()`: counts `/oauth/token` POSTs by grant type; call `restore()` in `afterEach`.
- `installFetchFault(match, fault, { times? })`: `match` is `{ urlIncludes?, method?, grantType?, predicate? }`; `fault` is `{ kind: "status", status, body?, headers? }`, `{ kind: "network", message? }` (rejects with `TypeError("fetch failed")`) or `{ kind: "delay", ms }` (then passes through). Returns `{ injected, restore() }`. `times` faults the first N matches, then passes through.
- `generateDpopKeyPair()` and `buildDpopProof(keys, { htm, htu, accessToken?, nonce?, iat?, jti? })`: ES256 key generated at runtime and an RFC 9449 proof JWT (`ath` is set when `accessToken` is given). `keys.jkt` is the thumbprint for `cnf.jkt`.
- `describeRequest(input, init)`: URL, method and grant type of a fetch call.

### Fetch seams: what the global `fetch` wrappers can reach

`createMcpClient` accepts no custom fetch, so `globalThis.fetch` is the only seam. Verified against the installed core (`@auth0/auth0-api-js`) and `jose`:

- Token endpoint calls (exchange, client credentials, Token Vault) call the global `fetch` on every request. Faultable at any time.
- OIDC discovery (`oauth4webapi` `discoveryRequest`) uses the global `fetch` at call time, but the metadata is cached per client after the first success.
- JWKS (`jose` `createRemoteJWKSet`) goes through the global `fetch`, but the core binds the `fetch` it sees when the JWKS set is first created (first token verification per client and JWKS URI), and caches the set. A fault installed after that point is not seen.
- So for JWKS and discovery faults: install the fault, then create a fresh server (new client), then send the first authenticated request. A failed fetch is not cached; the next request retries and succeeds.
- Observed (live): a 503 on the JWKS or the discovery GET makes ingress answer 401 with a Bearer challenge, not 500, because the core reports any verification failure as `VerifyAccessTokenError`. The retry after the fault is served normally.

### Install order of `installFetchCounter` and `installFetchFault`

The later install is the outer wrapper. Install the fault first and the counter second to count every attempt including faulted ones (a faulted exchange then shows in `counter.exchanges`). Install the counter first and the fault second to count only requests that reach the network. Restore in reverse order of installation.
