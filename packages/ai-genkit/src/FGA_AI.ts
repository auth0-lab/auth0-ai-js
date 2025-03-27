import { z } from "genkit";

import { FGAAuthorizerBase } from "@auth0/ai/FGA";

import { FGAAuthorizer } from "./FGA";
import { ToolWrapper } from "./util/types";

import type { ToolFn } from "@genkit-ai/ai/tool";

type FGAAuthorizerParams = ConstructorParameters<typeof FGAAuthorizerBase>[0];
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

  /**
   *
   * Returns a tool authorizer that protects the tool execution
   * with the Fine Grained Authorization (FGA) authorization control.
   *
   * @param params - The parameters for the FGA authorization control.
   * @returns A tool authorizer.
   */
  withFGA(params: FGAParams): ToolWrapper;

  /**
   *
   * Protects a tool function with Fine Grained Authorization (FGA) authorization control.
   *
   * @param params - The parameters for the FGA authorization control.
   * @param tool - The tool to protect.
   * @returns The protected tool.
   */
  withFGA<T extends ToolFn<z.AnyZodObject, z.AnyZodObject>>(
    params: FGAParams,
    tool: T
  ): T;

  /**
   *
   * Builds an FGA authorizer for a tool.
   * if a tool is provided, the authorizer is applied to the tool.
   * @param params - The parameters for the FGA authorization control.
   * @param tool - The tool function to protect.
   * @returns
   */
  withFGA<T extends ToolFn<z.AnyZodObject, z.AnyZodObject>>(
    params: FGAParams,
    tool?: T
  ) {
    const fc = new FGAAuthorizer(this.fgaParams, params);
    const authorizer = fc.authorizer();
    if (tool) {
      return authorizer(tool);
    }
    return authorizer;
  }
}
