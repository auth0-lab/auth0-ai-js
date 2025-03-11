import { FGAAuthorizerBase } from "@auth0/ai/FGA";

import { FGAAuthorizer } from "./FGA";
import { LlamaToolHandler } from "./FGA/FGAAuthorizer";

type FGAAuthorizerParams = ConstructorParameters<typeof FGAAuthorizerBase>[0];
type ToolWrapper = ReturnType<FGAAuthorizer["authorizer"]>;
type FGAParams = ConstructorParameters<typeof FGAAuthorizer>[1];

/**
 * A class for integrating Fine-Grained Authorization with AI tools.
 *
 * This class provides functionality to wrap AI tools with FGA authorization controls.
 * It allows for authorization checks to be applied to AI tools before they are used.
 *
 * @example
 * ```typescript
 * const fgaAI = new FGA_AI({
 *   apiUrl: 'https://api.fga.example',
 *   storeId: 'store123',
 *   credentials: { ... }
 * });
 *
 * // Wrap an existing tool
 * const authorizedTool = fgaAI.withFGA({
 *  buildQuery: async ({userID, doc}) => ({ user: userID, object: doc, relation: 'read' })
 * }, myAITool);
 *
 * // Or create a wrapper to apply to tools later
 * const authorizer = fgaAI.withFGA({
 *  buildQuery: async ({userID, doc}) => ({ user: userID, object: doc, relation: 'read' })
 * });
 * const authorizedTool = authorizer(myAITool);
 * ```
 */
export class FGA_AI {
  constructor(private fgaParams?: FGAAuthorizerParams) {}

  withFGA(params: FGAParams): ToolWrapper;

  withFGA<T>(params: FGAParams, tool: LlamaToolHandler<T>): LlamaToolHandler<T>;

  withFGA<T>(params: FGAParams, tool?: LlamaToolHandler<T>) {
    const fc = new FGAAuthorizer(this.fgaParams, params);
    const authorizer = fc.authorizer();
    if (tool) {
      return authorizer(tool);
    }
    return authorizer;
  }
}
