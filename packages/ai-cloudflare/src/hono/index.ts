import type { Context, Next } from "hono";
import { setCookie } from "hono/cookie";
import {
  getAuth,
  revokeSession,
  getAuthorizationServer,
  getClient,
  OidcAuthEnv,
  OidcAuth,
  IDToken,
} from "@hono/oidc-auth";
import * as oauth2 from "oauth4webapi";
import { agentsMiddleware } from "hono-agents";
import { REFRESH_HEADER } from "..";

const DEFAULT_SCOPES = ["openid", "profile", "email", "offline_access"].join(
  " "
);

export const extendedOidcLoginHandler = async (c: Context) => {
  const state = oauth2.generateRandomState();
  const nonce = oauth2.generateRandomNonce();
  const code_verifier = oauth2.generateRandomCodeVerifier();
  const code_challenge = await oauth2.calculatePKCECodeChallenge(code_verifier);

  const as = await getAuthorizationServer(c);
  const client = getClient(c);

  // The above calls will have populated this
  const env = c.get("oidcAuthEnv") as OidcAuthEnv;

  const redirectUri = new URL(env.OIDC_REDIRECT_URI ?? "/", c.req.url);

  const authorizationRequestUrl = new URL(as.authorization_endpoint!);

  authorizationRequestUrl.searchParams.set("client_id", client.client_id);
  authorizationRequestUrl.searchParams.set(
    "redirect_uri",
    redirectUri.toString()
  );
  authorizationRequestUrl.searchParams.set("response_type", "code");
  authorizationRequestUrl.searchParams.set(
    "scope",
    env.OIDC_SCOPES || DEFAULT_SCOPES
  );
  authorizationRequestUrl.searchParams.set("state", state);
  authorizationRequestUrl.searchParams.set("nonce", nonce);
  authorizationRequestUrl.searchParams.set("code_challenge", code_challenge);
  authorizationRequestUrl.searchParams.set("code_challenge_method", "S256");
  if (env.OIDC_AUDIENCE) {
    authorizationRequestUrl.searchParams.set("audience", env.OIDC_AUDIENCE);
  }

  for (const key of [
    "access_type",
    "prompt",
    "connection",
    "connection_scope",
  ]) {
    const value = c.req.query(key);
    if (value) {
      authorizationRequestUrl.searchParams.set(key, value);
    }
  }

  const url = authorizationRequestUrl.toString();

  const returnPath = c.req.query("returnTo") || "/";

  const path = redirectUri.pathname;
  const cookieDomain = env.OIDC_COOKIE_DOMAIN;

  const cookieOptions =
    cookieDomain == null
      ? { path, httpOnly: true, secure: true }
      : { path, domain: cookieDomain, httpOnly: true, secure: true };
  setCookie(c, "state", state, cookieOptions);
  setCookie(c, "nonce", nonce, cookieOptions);
  setCookie(c, "code_verifier", code_verifier, cookieOptions);
  setCookie(
    c,
    "continue",
    new URL(returnPath, c.req.url).toString(),
    cookieOptions
  );

  return c.redirect(url);
};

export const extendedOidcLogoutHandler =
  (postLogoutRedirectUri: string | URL) => async (c: Context) => {
    const client = getClient(c);
    const as = await getAuthorizationServer(c);

    const url = new URL(as.end_session_endpoint ?? "");
    url.searchParams.set("client_id", client.client_id);
    url.searchParams.set(
      "post_logout_redirect_uri",
      postLogoutRedirectUri.toString()
    );

    const auth = await getAuth(c);
    if (auth?.sid) {
      url.searchParams.set("logout_hint", auth.sid as string);
    }

    await revokeSession(c);

    return c.redirect(url);
  };

export const baseOidcClaimsHook = async (
  orig: OidcAuth | undefined,
  claims: IDToken | undefined
) => ({
  name: (claims?.name as string) ?? orig?.name ?? "",
  email: (claims?.email as string) ?? orig?.email ?? "",
  sub: (claims?.sub as string) ?? orig?.sub ?? "",
  sid: (claims?.sid as string) ?? orig?.sid ?? "",
});

export const federatedConnectionAgentMiddleware: typeof agentsMiddleware =
  (options) => async (c: Context, next: Next) => {
    c.req.raw = new Request(c.req.raw, {
      headers: new Headers(c.req.raw.headers),
    });
    c.req.raw.headers.set(REFRESH_HEADER, (await getAuth(c))?.rtk ?? "");

    const redirectNormalizer = (req: Request) =>
      new Request(req, { redirect: "manual" });

    return agentsMiddleware({
      ...options,
      options: {
        ...(options ?? {}).options,
        onBeforeRequest: (req, lobby) => {
          req = redirectNormalizer(req);
          return options?.options?.onBeforeRequest?.(req, lobby) ?? req;
        },
        onBeforeConnect: (req, lobby) => {
          req = redirectNormalizer(req);
          return options?.options?.onBeforeConnect?.(req, lobby) ?? req;
        },
      },
    })(c, next);
  };
