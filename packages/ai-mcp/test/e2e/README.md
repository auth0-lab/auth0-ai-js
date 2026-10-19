# Real-tenant end-to-end tests

These specs use no mocks. A real user access token (password-realm grant) goes through a real
`@modelcontextprotocol/sdk` client and `StreamableHTTPClientTransport` over HTTP on localhost into
the real `@auth0/ai-mcp` handler, which performs a real token exchange against an Auth0 tenant. A local
downstream API verifies the forwarded bearer against the tenant JWKS (issuer, audience and RS256
checked) and reports the verified claims.

## Gating

Every spec is `describe.skipIf(!e2e.enabled)`. The suite is enabled only when `AUTH0_E2E=1`.
With `AUTH0_E2E=1` and a required variable missing, the spec file fails and names the missing
variables (never their values). Without `AUTH0_E2E=1`, `npm test` reports these specs as skipped.
No CI workflow sets `AUTH0_E2E`, so CI never runs them.

Run them with `npm run test:e2e` after exporting the variables below. Files run one at a time
(`--no-file-parallelism`) so they do not hit the tenant token endpoint at once. To run a subset,
pass file name fragments to the runner script, for example `run-e2e.sh m2m obo-cache`.

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
- `startMcpServer({ env, downstreamUrl, scopeMatching?, tokenStore?, requiredScopes?, organizationPolicy?, organizationId?, audience?, registerTools? })`: `{ url, client, close }`. Tools: `whoami`, `delegate({ scope?, audience? })`.
- `connectMcpClient(url, accessToken?)` and `callToolJson(client, name, args?)`: real SDK client.
- `postInitialize(url, authorization?)`: raw POST returning status and parsed `WWW-Authenticate`.
- `installFetchCounter()`: counts `/oauth/token` POSTs by grant type; call `restore()` in `afterEach`.
