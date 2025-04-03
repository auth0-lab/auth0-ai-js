import { FunctionTool, JSONValue } from "llamaindex";

import { FGAAuthorizerBase } from "@auth0/ai/FGA";

import { FGAAuthorizer } from "./FGA";

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
 *   buildQuery: async ({userID, doc}) => ({ user: userID, object: doc, relation: 'read' })
 *  }, tool(queryKnowledgeBase, {
 *    name: 'queryKnowledgeBase',
 *    description: 'Query knowledge base',
 *    parameters: z.object({
 *    question: z.string({
 *      description: 'The user question',
 *    }),
 *  }),
 * }));
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
  withFGA<
    T,
    R extends JSONValue | Promise<JSONValue>,
    AdditionalToolArgument extends object = object,
  >(
    params: FGAParams,
    tool: FunctionTool<T, R, AdditionalToolArgument>
  ): FunctionTool<T, R, AdditionalToolArgument>;

  /**
   *
   * Returns a tool authorizer function that can be used to protect AI tools
   * with Fine-Grained Authorization (FGA) controls. This authorizer can be
   * applied to tools at a later time.
   *
   * @param params - The parameters for configuring the FGA authorization control.
   * @returns A function that wraps and protects AI tools with FGA authorization.
   */
  withFGA(params: FGAParams): ToolWrapper;

  /**
   *
   * Immediately protects a given AI tool by wrapping it with Fine-Grained
   * Authorization (FGA) controls. The tool will only execute if the
   * authorization checks pass.
   *
   * @param params - The parameters for configuring the FGA authorization control.
   * @param tool - The AI tool to protect.
   * @returns The protected AI tool, which enforces FGA authorization checks.
   */
  withFGA<
    T,
    R extends JSONValue | Promise<JSONValue>,
    AdditionalToolArgument extends object = object,
  >(
    params: FGAParams,
    tool: FunctionTool<T, R, AdditionalToolArgument>
  ): FunctionTool<T, R, AdditionalToolArgument>;

  /**
   *
   * Builds an FGA authorizer function based on the provided parameters. If a tool
   * is supplied, it immediately applies the authorizer to the tool, protecting it
   * with FGA controls. Otherwise, it returns the authorizer function for later use.
   *
   * @param params - The parameters for configuring the FGA authorization control.
   * @param tool - (Optional) The AI tool to protect. If provided, the tool is
   *               immediately wrapped with FGA authorization.
   * @returns Either the protected AI tool (if a tool is provided) or an authorizer
   *          function that can be applied to tools later.
   */
  withFGA<
    T,
    R extends JSONValue | Promise<JSONValue>,
    AdditionalToolArgument extends object = object,
  >(
    params: FGAParams,
    tool?: FunctionTool<T, R, AdditionalToolArgument>
  ): FunctionTool<T, R, AdditionalToolArgument> | ToolWrapper;
  withFGA<
    T,
    R extends JSONValue | Promise<JSONValue>,
    AdditionalToolArgument extends object = object,
  >(params: FGAParams, tool?: FunctionTool<T, R, AdditionalToolArgument>) {
    const fc = new FGAAuthorizer(this.fgaParams, params);
    const authorizer = fc.authorizer();
    if (tool) {
      return authorizer(tool);
    }
    return authorizer;
  }
}
