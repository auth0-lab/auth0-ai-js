/**
 * The wrapper's client credentials API against the real tenant, using the M2M client. The
 * request-scoped client needs a verified caller, so a client credentials token for the MCP API is
 * used as the caller. The credentials that obtain the new token are the M2M client's own.
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { TokenByClientCredentialsError } from "@auth0/auth0-api-js";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createMcpClient } from "../../src/client.js";
import type { RequestScopedMcpClient } from "../../src/types.js";
import {
  M2M_VARS,
  decodeClaims,
  getClientCredentialsToken,
  installFetchCounter,
  loadE2eEnv,
} from "./support/index.js";
import type { FetchCounter } from "./support/index.js";

const e2e = loadE2eEnv(M2M_VARS);

describe.skipIf(!e2e.enabled)("e2e client credentials through the wrapper", () => {
  let scoped: RequestScopedMcpClient;
  let counter: FetchCounter | undefined;

  beforeAll(async () => {
    const mcpClient = createMcpClient({
      domain: e2e.domain,
      audience: e2e.mcpAudience,
      clientId: e2e.m2mClientId,
      clientSecret: e2e.m2mClientSecret,
    });
    const callerToken = await getClientCredentialsToken(e2e, { audience: e2e.mcpAudience });
    const caller = await mcpClient.verifyAccessToken({ accessToken: callerToken });
    scoped = mcpClient.withToken(caller);
  });

  afterEach(() => {
    counter?.restore();
    counter = undefined;
  });

  it("returns a real token that verifies against the tenant keys, with the requested scope granted", async () => {
    const result = await scoped.getClientCredentialsToken({ audience: e2e.mcpAudience, scope: "work:read" });

    const jwks = createRemoteJWKSet(new URL(`https://${e2e.domain}/.well-known/jwks.json`));
    const { payload, protectedHeader } = await jwtVerify(result.accessToken, jwks, {
      issuer: e2e.issuer,
      audience: e2e.mcpAudience,
      algorithms: ["RS256"],
    });
    expect(protectedHeader.alg).toBe("RS256");
    expect(payload["azp"]).toBe(e2e.m2mClientId);
    expect(payload["scope"]).toBe("work:read");
    expect(result.scope).toBe("work:read");
    expect(result.grantedScopes).toEqual(["work:read"]);
    expect(result.expiresAt).toBe(payload.exp);
  });

  it("without a scope the grant is whatever the client holds, and the result reports it", async () => {
    const result = await scoped.getClientCredentialsToken({ audience: e2e.mcpAudience });
    expect(result.scope).toBe("work:read");
    expect(result.grantedScopes).toEqual(["work:read"]);
    expect(decodeClaims(result.accessToken)["scope"]).toBe("work:read");
  });

  for (const [label, scope] of [
    ["partial", "work:read e2e:undefined"],
    ["zero", "e2e:undefined"],
  ] as const) {
    it(`a ${label} scope request is refused by the tenant and surfaces as a sanitized error`, async () => {
      // The tenant answers 403 access_denied to a client credentials request for a scope the
      // client was never granted, so the wrapper's own narrowing check is never reached.
      const error = await scoped
        .getClientCredentialsToken({ audience: e2e.mcpAudience, scope })
        .then(() => undefined, (e: unknown) => e as Error);
      expect(error).toBeInstanceOf(Error);
      expect(error!.message).toBe("The token operation failed.");
      expect(error).toBeInstanceOf(TokenByClientCredentialsError);
      expect(error!.name).toBe("TokenByClientCredentialsError");
      // The tenant's reason stays on the cause chain for server-side diagnostics only.
      const reason = (error!.cause as { cause?: { error?: string } } | undefined)?.cause?.error;
      expect(reason).toBe("access_denied");
    });
  }

  it("holds no cache: every call is a client credentials request to the tenant", async () => {
    counter = installFetchCounter();
    const grant = "client_credentials";
    const first = await scoped.getClientCredentialsToken({ audience: e2e.mcpAudience, scope: "work:read" });
    expect(counter.count(grant)).toBe(1);
    const second = await scoped.getClientCredentialsToken({ audience: e2e.mcpAudience, scope: "work:read" });
    expect(counter.count(grant)).toBe(2);
    expect(second.grantedScopes).toEqual(first.grantedScopes);
  });
});
