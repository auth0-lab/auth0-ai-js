import { UnauthenticatedError } from '@auth0/ai-mcp';
import type { McpClientOptions, Principal, RequestContext, RequestScopedMcpClient } from '@auth0/ai-mcp';

const error: Error = new UnauthenticatedError();
export type Surface = [McpClientOptions, Principal, RequestContext, RequestScopedMcpClient];
export default error;
