import { ApiClient, buildOboTokenKey, normalizeScopes } from '@auth0/auth0-api-js';
import type { OboCacheKeyLayout, OnBehalfOfTokenResult, TokenStore, VerifiedToken } from '@auth0/auth0-api-js';
import { DownscopedTokenError } from './errors.js';
import type { SingleFlight } from './single-flight.js';
import type {
  ClientCredentialsOptions,
  ClientCredentialsTokenResult,
  OnBehalfOfOptions,
  Principal,
  RequestScopedMcpClient,
  TokenForServiceOptions,
} from './types.js';

/** Everything a request-scoped client needs from its parent client. */
export interface RequestScopedClientInit {
  /** The core client that performs the token operations. */
  readonly apiClient: ApiClient;
  /** Cache for exchanged tokens, or `undefined` to exchange on every call. */
  readonly tokenStore: TokenStore | undefined;
  /** The caller's identity. */
  readonly principal: Principal;
  /** The caller's verified token, exactly as produced by token verification. */
  readonly verified: VerifiedToken;
  /**
   * Shared by every request-scoped client created by the same parent client, so that
   * concurrent identical exchanges collapse into one.
   */
  readonly exchanges: SingleFlight<OnBehalfOfTokenResult>;
  /**
   * What the parent client fixes for every exchange it performs. These never differ
   * between request-scoped clients of one parent, and are part of the de-duplication key
   * so the key stays a superset of what the core cache distinguishes.
   */
  readonly exchangeIdentity: ExchangeIdentity;
}

/** The parent client's side of an exchange: who performs it and how scopes are matched. */
export interface ExchangeIdentity {
  /** The tenant domain the exchange is sent to. */
  readonly tenant: string;
  /** The client id performing the exchange, if configured. */
  readonly clientId: string | undefined;
  /** The audience the parent client validates incoming tokens against. */
  readonly audience: string;
  /** The scope matching layout the core client caches under. */
  readonly layout: OboCacheKeyLayout;
}

const KEYED_CLAIMS = ['iss', 'client_id', 'azp', 'sub', 'org_id', 'sid', 'jti'] as const;

/**
 * Builds the key that decides which concurrent exchanges may share one result, or
 * `undefined` when the caller's claims cannot be keyed safely and the exchange must not
 * be shared.
 *
 * The key is derived by the core client's own cache key builder from the same inputs the
 * core cache uses: exchanging tenant, client and audience, the subject token's issuer,
 * client, subject, organization and session (`sid`, else `jti`, else a digest of the
 * token), the requested audience and the normalized scope set. Two requests that core
 * would cache separately therefore never share a flight.
 */
function flightKey(identity: ExchangeIdentity, verified: VerifiedToken, audience: string, scope: string | undefined) {
  const claims = verified.claims as Record<string, unknown>;
  // The key encoding reads a non-string claim as absent, so such a token could collide with
  // a different identity. Exchange it alone.
  if (KEYED_CLAIMS.some((name) => claims[name] !== undefined && typeof claims[name] !== 'string')) {
    return undefined;
  }
  return buildOboTokenKey({
    layout: identity.layout,
    exchangeTenant: identity.tenant,
    exchangeClientId: identity.clientId,
    exchangeAudience: identity.audience,
    verified,
    requestedAudience: audience,
    scope,
  });
}

/**
 * Throws when scopes were requested and the grant does not include all of them.
 * No scope requested means nothing to enforce.
 */
function assertCovers(requested: string | undefined, grantedScopes: readonly string[]): void {
  if (requested === undefined) return;
  const granted = new Set(grantedScopes);
  if (!normalizeScopes(requested).every((scope) => granted.has(scope))) {
    throw new DownscopedTokenError();
  }
}

/**
 * Creates a {@link RequestScopedMcpClient} bound to one verified caller.
 *
 * The access token and verified claims are held in closure variables only. The
 * returned object has no data properties, so serializing or logging it cannot
 * reveal the token.
 *
 * The caller's `verified` object must be the one the core client produced for
 * this exact token. It is passed to the core client untouched, because the core
 * client recognizes verified claims by object identity.
 *
 * @param init - The core client, optional token store and the verified caller.
 * @returns A frozen client that always acts for the given caller.
 */
export function createRequestScopedClient(init: RequestScopedClientInit): RequestScopedMcpClient {
  const { apiClient, tokenStore, principal, verified, exchanges, exchangeIdentity } = init;

  const exchange = (options: OnBehalfOfOptions) =>
    apiClient.getTokenOnBehalfOf(
      verified.accessToken,
      {
        audience: options.audience,
        ...(options.scope !== undefined && { scope: options.scope }),
      },
      { ...(tokenStore !== undefined && { store: tokenStore }), verified }
    );

  return Object.freeze({
    async getTokenOnBehalfOf(options: OnBehalfOfOptions) {
      // Concurrent identical requests from this parent client share one exchange. The
      // outcome is not remembered once it settles, so a failure is retried by the next call.
      const key = flightKey(exchangeIdentity, verified, options.audience, options.scope);
      const shared = key === undefined ? await exchange(options) : await exchanges.run(key, () => exchange(options));
      // Each caller gets its own copy, so one caller changing its result cannot alter another's.
      const result = { ...shared, grantedScopes: [...shared.grantedScopes] };

      // The core client caches the token under the scopes it was granted and does not
      // reject a narrowed result. Rejecting it here keeps the cache correct (a later,
      // narrower request can still reuse it) while this caller never runs with less
      // authority than it asked for. This runs per caller, after the shared exchange.
      assertCovers(options.scope, result.grantedScopes);
      return result;
    },

    async getClientCredentialsToken(options: ClientCredentialsOptions): Promise<ClientCredentialsTokenResult> {
      const result = await apiClient.getClientCredentialsToken({
        audience: options.audience,
        ...(options.scope !== undefined && { scope: options.scope }),
      });
      const grantedScopes = normalizeScopes(result.scope ?? options.scope ?? '');
      assertCovers(options.scope, grantedScopes);
      return { ...result, grantedScopes };
    },

    getTokenForService(options: TokenForServiceOptions) {
      return apiClient.getAccessTokenForConnection({
        connection: options.connection,
        accessToken: verified.accessToken,
        ...(options.loginHint !== undefined && { loginHint: options.loginHint }),
      });
    },

    getPrincipal(): Principal {
      return principal;
    },
  });
}
