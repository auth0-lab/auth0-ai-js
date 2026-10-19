/** Hermetic checks of the e2e helpers. They need no tenant and run with the normal unit suite. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import { createHash } from "node:crypto";
import {
  buildDpopProof,
  generateDpopKeyPair,
  installFetchCounter,
  installFetchFault,
  startWebMcpServer,
  TOKEN_EXCHANGE_GRANT,
} from "./index.js";
import type { E2eEnv } from "./index.js";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch() {
  const stub = vi.fn(async () => new Response("ok", { status: 200 }));
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

const exchangeBody = new URLSearchParams({ grant_type: TOKEN_EXCHANGE_GRANT }).toString();

describe("installFetchFault", () => {
  it("answers a matching request with the given status and body, then passes through after `times`", async () => {
    const stub = stubFetch();
    const fault = installFetchFault(
      { urlIncludes: "/oauth/token", method: "post", grantType: TOKEN_EXCHANGE_GRANT },
      { kind: "status", status: 503, body: { error: "server_error" } },
      { times: 1 },
    );
    const call = () => fetch("https://tenant.test/oauth/token", { method: "POST", body: exchangeBody });
    const first = await call();
    expect(first.status).toBe(503);
    expect(await first.json()).toEqual({ error: "server_error" });
    expect((await call()).status).toBe(200);
    expect(stub).toHaveBeenCalledTimes(1);
    expect(fault.injected).toBe(1);
  });

  it("leaves non-matching requests alone", async () => {
    const stub = stubFetch();
    installFetchFault({ grantType: TOKEN_EXCHANGE_GRANT }, { kind: "network" });
    const other = await fetch("https://tenant.test/oauth/token", {
      method: "POST",
      body: "grant_type=client_credentials",
    });
    expect(other.status).toBe(200);
    expect((await fetch("https://tenant.test/.well-known/jwks.json")).status).toBe(200);
    expect(stub).toHaveBeenCalledTimes(2);
  });

  it("rejects with a TypeError for a network fault and delays for a delay fault", async () => {
    const stub = stubFetch();
    const network = installFetchFault({ urlIncludes: "jwks" }, { kind: "network" }, { times: 1 });
    await expect(fetch("https://tenant.test/.well-known/jwks.json")).rejects.toBeInstanceOf(TypeError);
    network.restore();
    installFetchFault({}, { kind: "delay", ms: 30 });
    const started = Date.now();
    expect((await fetch("https://tenant.test/x")).status).toBe(200);
    expect(Date.now() - started).toBeGreaterThanOrEqual(25);
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it("restores in LIFO order and tolerates out-of-order restore", async () => {
    const stub = stubFetch();
    const base = globalThis.fetch;
    const inner = installFetchFault({}, { kind: "status", status: 500 });
    const outer = installFetchFault({ urlIncludes: "never-matches" }, { kind: "network" });
    inner.restore();
    expect((await fetch("https://tenant.test/x")).status).toBe(200);
    outer.restore();
    expect(globalThis.fetch).not.toBe(base);
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it("composes with the counter: the later install is the outer wrapper", async () => {
    stubFetch();
    const fault = installFetchFault({ grantType: TOKEN_EXCHANGE_GRANT }, { kind: "status", status: 503 });
    const counter = installFetchCounter();
    const call = () => fetch("https://tenant.test/oauth/token", { method: "POST", body: exchangeBody });
    expect((await call()).status).toBe(503);
    expect(counter.exchanges).toBe(1);
    counter.restore();
    fault.restore();
  });
});

describe("DPoP proof helper", () => {
  it("builds an RFC 9449 proof that verifies with its embedded key and binds the token", async () => {
    const keys = await generateDpopKeyPair();
    const proof = await buildDpopProof(keys, {
      htm: "post",
      htu: "https://mcp.example.test/mcp",
      accessToken: "opaque-test-token",
    });
    const header = decodeProtectedHeader(proof);
    expect(header.typ).toBe("dpop+jwt");
    expect(header.alg).toBe("ES256");
    expect(header.jwk).toMatchObject({ kty: "EC", crv: "P-256" });
    expect(header.jwk).not.toHaveProperty("d");
    const { payload } = await jwtVerify(proof, await importJWK(keys.jwk, "ES256"));
    expect(payload["htm"]).toBe("POST");
    expect(payload["htu"]).toBe("https://mcp.example.test/mcp");
    expect(payload["ath"]).toBe(createHash("sha256").update("opaque-test-token").digest("base64url"));
    expect(typeof payload["jti"]).toBe("string");
    expect(typeof payload.iat).toBe("number");
    expect(keys.jkt).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("generates a distinct key pair each time", async () => {
    expect((await generateDpopKeyPair()).jkt).not.toBe((await generateDpopKeyPair()).jkt);
  });
});

describe("startWebMcpServer (no tenant needed for unauthenticated routes)", () => {
  const env = {
    domain: "tenant.example.test",
    issuer: "https://tenant.example.test/",
    mcpAudience: "https://mcp.example.test/api",
    downstreamAudience: "https://work.example.test",
    downstreamScope: "work:read",
    oboClientId: "client",
    oboClientSecret: "not-a-real-secret",
  } as unknown as E2eEnv;

  it("serves the metadata route and challenges a request without credentials", async () => {
    const server = await startWebMcpServer({ env, downstreamUrl: "http://127.0.0.1:1/" });
    try {
      expect(server.htu).toBe("https://mcp.example.test/mcp");
      const meta = await fetch(server.metadataUrl);
      expect(meta.status).toBe(200);
      const doc = (await meta.json()) as { resource: string; authorization_servers: string[] };
      expect(doc.resource).toBe(env.mcpAudience);
      expect(doc.authorization_servers).toEqual([env.issuer]);
      const denied = await fetch(server.url, { method: "POST", body: "{}" });
      expect(denied.status).toBe(401);
      expect(denied.headers.get("www-authenticate")).toContain(
        "resource_metadata=\"https://mcp.example.test/.well-known/oauth-protected-resource/api\"",
      );
      const viaHandle = await server.handle(new Request("https://mcp.example.test/mcp", { method: "GET" }));
      expect(viaHandle.status).toBe(401);
    } finally {
      await server.close();
    }
  });
});
