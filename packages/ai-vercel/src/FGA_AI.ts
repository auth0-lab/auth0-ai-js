import { Tool } from "ai";

import { FGAAuthorizer } from "./FGA";

type FGAAuthorizerParams = ConstructorParameters<typeof FGAAuthorizer>[0];
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
 *   modelName: 'gpt-4',
 *   userID: 'user123'
 * }, myAITool);
 *
 * // Or create a wrapper to apply to tools later
 * const authorizer = fgaAI.withFGA({
 *   modelName: 'gpt-4',
 *   userID: 'user123'
 * });
 * const authorizedTool = authorizer(myAITool);
 * ```
 */
export class FGA_AI {
  constructor(private fgaParams: FGAAuthorizerParams) {}

  withFGA(params: FGAParams): ToolWrapper;

  withFGA(params: FGAParams, tool: Tool): Tool;

  withFGA(params: FGAParams, tool?: Tool) {
    const fc = new FGAAuthorizer(this.fgaParams, params);
    const authorizer = fc.authorizer();
    if (tool) {
      return authorizer(tool);
    }
    return authorizer;
  }
}
