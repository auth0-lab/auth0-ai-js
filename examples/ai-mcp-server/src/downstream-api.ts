import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTVerifyGetKey } from "jose";
import type { DownstreamConfig } from "./config.js";

/**
 * A small resource server. It verifies every token before it answers: signature
 * (from the tenant's JWKS), issuer, audience, expiry and scope. A request that
 * fails any check never reaches the data.
 */

const REPORTS = [
  { id: "r-1", title: "Quarterly summary" },
  { id: "r-2", title: "Usage by region" },
];

function send(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function bearerToken(req: IncomingMessage): string | undefined {
  const match = /^Bearer +([A-Za-z0-9\-._~+/]+=*)$/.exec(
    req.headers.authorization ?? "",
  );
  return match?.[1];
}

export function createDownstreamListener(
  config: DownstreamConfig,
  keys?: JWTVerifyGetKey,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const issuer = `https://${config.domain}/`;
  const getKey =
    keys ?? createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));

  return async (req, res) => {
    const token = bearerToken(req);
    if (token === undefined) {
      send(
        res,
        401,
        { error: "invalid_token" },
        { "www-authenticate": "Bearer" },
      );
      return;
    }
    let scopes: string[];
    try {
      const { payload } = await jwtVerify(token, getKey, {
        issuer,
        audience: config.audience,
        algorithms: ["RS256"],
        requiredClaims: ["exp", "sub"],
      });
      scopes =
        typeof payload["scope"] === "string"
          ? payload["scope"].split(/\s+/)
          : [];
    } catch {
      send(
        res,
        401,
        { error: "invalid_token" },
        { "www-authenticate": 'Bearer error="invalid_token"' },
      );
      return;
    }
    if (!scopes.includes(config.requiredScope)) {
      send(
        res,
        403,
        { error: "insufficient_scope" },
        {
          "www-authenticate": `Bearer error="insufficient_scope", scope="${config.requiredScope}"`,
        },
      );
      return;
    }
    if (new URL(req.url ?? "/", "http://localhost").pathname !== "/reports") {
      send(res, 404, { error: "not_found" });
      return;
    }
    send(res, 200, { reports: REPORTS });
  };
}

export function createDownstreamServer(
  config: DownstreamConfig,
  keys?: JWTVerifyGetKey,
): Server {
  const listener = createDownstreamListener(config, keys);
  return createServer((req, res) => {
    listener(req, res).catch(() => send(res, 500, { error: "server_error" }));
  });
}
