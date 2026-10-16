import { ApiClient, normalizeScopes } from '@auth0/auth0-api-js';
import type { TokenStore, VerifiedToken } from '@auth0/auth0-api-js';
import { DownscopedTokenError } from './errors.js';
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
  const { apiClient, tokenStore, principal, verified } = init;

  return Object.freeze({
    async getTokenOnBehalfOf(options: OnBehalfOfOptions) {
      const result = await apiClient.getTokenOnBehalfOf(
        verified.accessToken,
        {
          audience: options.audience,
          ...(options.scope !== undefined && { scope: options.scope }),
        },
        { ...(tokenStore !== undefined && { store: tokenStore }), verified }
      );

      // The core client caches the token under the scopes it was granted and does not
      // reject a narrowed result. Rejecting it here keeps the cache correct (a later,
      // narrower request can still reuse it) while this caller never runs with less
      // authority than it asked for.
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
