import { ApiClient, InvalidConfigurationError } from '@auth0/auth0-api-js';
import type { IndexedTokenStore, TokenStore, VerifiedToken, VerifyAccessTokenOptions } from '@auth0/auth0-api-js';
import { UnauthenticatedError } from './errors.js';
import { buildPrincipal } from './principal.js';
import { createRequestScopedClient } from './request-scoped-client.js';
import type { McpClientOptions, Principal, RequestScopedMcpClient } from './types.js';

/**
 * An opaque handle for a caller whose access token has been verified by an
 * {@link McpClient}.
 *
 * It exposes only the caller's {@link Principal}. The verified token is held
 * privately by the client that issued the handle, and the handle serializes and
 * inspects to a redacted view, so logging it cannot leak a credential. Only
 * {@link McpClient.verifyAccessToken} produces handles that
 * {@link McpClient.withToken} accepts. A copy, a hand-built object or a handle from
 * another client is rejected.
 */
export interface VerifiedCaller {
  /** The caller's identity. */
  readonly principal: Principal;
}

/** Verifies incoming access tokens and creates clients bound to the verified caller. */
export interface McpClient {
  /**
   * Verifies an access token (Bearer or DPoP) and resolves the caller. Organization
   * policy and DPoP rules configured on the client are enforced here. Errors from the
   * core client propagate unchanged.
   *
   * A DPoP-bound subject token can be exchanged on behalf of the caller only because
   * it is verified here, at ingress, and the verified claims are passed to the core
   * client. The exchange request itself carries no DPoP proof. If the authorization
   * server rejects that exchange, the error propagates to the caller.
   *
   * With `dpop.mode` set to `'disabled'` the core client accepts a DPoP-bound token
   * presented as a Bearer token. Leave DPoP enabled unless you intend that.
   */
  verifyAccessToken(options: VerifyAccessTokenOptions): Promise<VerifiedCaller>;
  /**
   * Creates a client bound to a caller returned by this client's
   * {@link McpClient.verifyAccessToken}.
   * @throws {UnauthenticatedError} When `caller` was not produced by this client, or
   * when the caller's token has expired.
   */
  withToken(caller: VerifiedCaller): RequestScopedMcpClient;
}

function isIndexedStore(store: TokenStore | undefined): store is IndexedTokenStore {
  const candidate = store as Partial<IndexedTokenStore> | undefined;
  return typeof candidate?.addIndexMember === 'function' && typeof candidate.listIndexMembers === 'function';
}

const CORE_CLIENT_OPTIONS = [
  'clientId',
  'clientSecret',
  'scopeMatching',
  'organizationPolicy',
  'organizationId',
  'dpop',
] as const;

/**
 * Creates an {@link McpClient}.
 *
 * When `scopeMatching` is `'non_strict'` and no indexed `tokenStore` is supplied, this
 * throws at construction. If you pass your own `apiClient`, its matching mode cannot be
 * read, so that check is skipped and the core client reports a mismatch on the first
 * token request instead. Supplying `apiClient` together with any option that configures
 * the core client is rejected, so no setting is silently ignored.
 *
 * @throws {InvalidConfigurationError} On an unusable scope matching and store combination,
 * on `apiClient` combined with core client options, or on any invalid option the core
 * client rejects.
 */
export function createMcpClient(options: McpClientOptions): McpClient {
  if (options.apiClient !== undefined) {
    const conflicting = CORE_CLIENT_OPTIONS.filter((name) => options[name] !== undefined);
    if (conflicting.length > 0) {
      throw new InvalidConfigurationError(
        `Invalid configuration: "apiClient" cannot be combined with ${conflicting.map((n) => `"${n}"`).join(', ')}. Configure those on the client you pass in.`
      );
    }
  } else if (options.scopeMatching === 'non_strict' && !isIndexedStore(options.tokenStore)) {
    throw new InvalidConfigurationError(
      'Invalid scope matching configuration: "non_strict" requires an indexed token store.'
    );
  }

  const apiClient =
    options.apiClient ??
    new ApiClient({
      domain: options.domain,
      audience: options.audience,
      ...(options.clientId !== undefined && { clientId: options.clientId }),
      ...(options.clientSecret !== undefined && { clientSecret: options.clientSecret }),
      ...(options.scopeMatching !== undefined && { scopeMatching: options.scopeMatching }),
      ...(options.organizationPolicy !== undefined && { organizationPolicy: options.organizationPolicy }),
      ...(options.organizationId !== undefined && { organizationId: options.organizationId }),
      ...(options.dpop !== undefined && { dpop: options.dpop }),
    });

  const tokenStore = options.tokenStore;
  // Maps each handle this client issued to the token the core client verified. Without a
  // store the core client only compares token strings and never re-verifies, so a handle
  // this client did not issue must never reach it. The core claims object is stored as
  // returned, because the core client recognizes verified claims by object identity.
  const issued = new WeakMap<VerifiedCaller, VerifiedToken>();

  return {
    async verifyAccessToken(verifyOptions) {
      const claims = await apiClient.verifyAccessToken(verifyOptions);
      const principal = buildPrincipal(claims);
      const redacted = () => ({ principal });
      const caller: VerifiedCaller = Object.freeze({
        principal,
        toJSON: redacted,
        [Symbol.for('nodejs.util.inspect.custom')]: () => ({ principal }),
      });
      issued.set(caller, Object.freeze({ accessToken: verifyOptions.accessToken, claims }));
      return caller;
    },

    withToken(caller) {
      const verified = typeof caller === 'object' && caller !== null ? issued.get(caller) : undefined;
      if (verified === undefined) {
        throw new UnauthenticatedError('Caller was not verified by this client.');
      }
      if (caller.principal.expiresAt <= Math.floor(Date.now() / 1000)) {
        throw new UnauthenticatedError('Access token has expired.');
      }
      return createRequestScopedClient({
        apiClient,
        tokenStore,
        principal: caller.principal,
        verified,
      });
    },
  };
}
