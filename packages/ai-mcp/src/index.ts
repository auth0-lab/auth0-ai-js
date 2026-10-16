// Public entry point of @auth0/ai-mcp: error classes and the types describing the client surface.
export { UnauthenticatedError, InsufficientScopeError, DownscopedTokenError } from './errors.js';
export type {
  Principal,
  RequestContext,
  McpClientOptions,
  RequestScopedMcpClient,
  ScopeMatching,
  OrganizationPolicy,
  OnBehalfOfOptions,
  ClientCredentialsOptions,
  TokenForServiceOptions,
  ClientCredentialsTokenResult,
  ServiceTokenResult,
} from './types.js';
