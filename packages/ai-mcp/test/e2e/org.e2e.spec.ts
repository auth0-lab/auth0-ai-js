/**
 * Organization policy at ingress, driven by client credentials tokens from the M2M client: a token
 * minted with `organization` carries `org_id`, one minted without it does not.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  M2M_VARS,
  ORG_VARS,
  callToolJson,
  connectMcpClient,
  decodeClaims,
  getClientCredentialsToken,
  loadE2eEnv,
  postInitialize,
  startDownstreamApi,
  startMcpServer,
} from "./support/index.js";
import type { DownstreamApi, E2eMcpServer } from "./support/index.js";

const e2e = loadE2eEnv([...M2M_VARS, ...ORG_VARS]);

/** A well-formed organization id that is not the tenant's. */
const OTHER_ORG = "org_e2eNotThisOrganization";

describe.skipIf(!e2e.enabled)("e2e organization policy", () => {
  let downstream: DownstreamApi;
  let withOrg: string;
  let withoutOrg: string;
  const servers: E2eMcpServer[] = [];

  const start = async (options: { organizationId?: string | string[] }) => {
    const server = await startMcpServer({
      env: e2e,
      downstreamUrl: downstream.url,
      organizationPolicy: "required",
      ...options,
    });
    servers.push(server);
    return server;
  };

  beforeAll(async () => {
    downstream = await startDownstreamApi({ domain: e2e.domain, audience: e2e.downstreamAudience });
    withOrg = await getClientCredentialsToken(e2e, { audience: e2e.mcpAudience, organization: e2e.orgId });
    withoutOrg = await getClientCredentialsToken(e2e, { audience: e2e.mcpAudience });
  });

  afterAll(async () => {
    await Promise.all(servers.map((s) => s.close()));
    await downstream?.close();
  });

  it("the minted tokens differ in the org_id claim as the scenarios assume", () => {
    expect(decodeClaims(withOrg)["org_id"]).toBe(e2e.orgId);
    expect(decodeClaims(withoutOrg)).not.toHaveProperty("org_id");
  });

  it("serves a token of an allowed organization and exposes org_id to the tool", async () => {
    const server = await start({ organizationId: [e2e.orgId] });
    const session = await connectMcpClient(server.url, withOrg);
    try {
      const { isError, value } = await callToolJson<{ orgId: string | null; sub: string }>(session.client, "whoami");
      expect(isError).toBe(false);
      expect(value.orgId).toBe(e2e.orgId);
      expect(value.sub).toMatch(/@clients$/);
    } finally {
      await session.close();
    }
  });

  it("serves a token with an organization when the policy has no allowlist", async () => {
    const server = await start({});
    const session = await connectMcpClient(server.url, withOrg);
    try {
      const { isError, value } = await callToolJson<{ orgId: string | null }>(session.client, "whoami");
      expect(isError).toBe(false);
      expect(value.orgId).toBe(e2e.orgId);
    } finally {
      await session.close();
    }
  });

  it("rejects a token without an organization with 401 invalid_token", async () => {
    const server = await start({ organizationId: [e2e.orgId] });
    const res = await postInitialize(server.url, `Bearer ${withoutOrg}`);
    expect(res.status).toBe(401);
    expect(res.challenge?.scheme).toBe("Bearer");
    expect(res.challenge?.params["error"]).toBe("invalid_token");
  });

  it("rejects a token without an organization when the policy has no allowlist", async () => {
    const server = await start({});
    const res = await postInitialize(server.url, `Bearer ${withoutOrg}`);
    expect(res.status).toBe(401);
    expect(res.challenge?.params["error"]).toBe("invalid_token");
  });

  it("rejects a token of an organization missing from the allowlist with 401 invalid_token", async () => {
    const server = await start({ organizationId: [OTHER_ORG] });
    const res = await postInitialize(server.url, `Bearer ${withOrg}`);
    expect(res.status).toBe(401);
    expect(res.challenge?.params["error"]).toBe("invalid_token");
    // The challenge must not reveal which organizations the server accepts.
    expect(res.wwwAuthenticate).not.toContain(OTHER_ORG);
    expect(res.wwwAuthenticate).not.toContain(e2e.orgId);
  });

  it("accepts the organization when it is one of several allowed", async () => {
    const server = await start({ organizationId: [OTHER_ORG, e2e.orgId] });
    const res = await postInitialize(server.url, `Bearer ${withOrg}`);
    expect(res.status).toBe(200);
  });
});
