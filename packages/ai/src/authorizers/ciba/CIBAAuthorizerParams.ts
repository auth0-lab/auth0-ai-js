import { CIBAInterrupt } from "src/interrupts";
import { AuthorizerToolParameter } from "src/parameters";

import { CIBAAuthorizationRequest } from "./CIBAAuthorizationRequest";

export type OnAuthorizationRequest = "block" | "interrupt";

export type CIBAAuthorizerParams<ToolExecuteArgs extends any[]> = {
  /**
   * The user ID to request authorization for.
   */
  userID: AuthorizerToolParameter<ToolExecuteArgs>;

  /**
   * The binding message to send to the user.
   */
  bindingMessage: AuthorizerToolParameter<ToolExecuteArgs>;

  /**
   * The scope to request authorization for.
   */
  scopes: string[];

  /**
   * The audience to request authorization for.
   */
  audience?: string;

  /**
   * The time in seconds for the authorization request to expire.
   */
  requestExpiry?: number;

  /**
   * The behavior when the authorization request is made.
   *
   * - `block`: The tool execution is blocked until the user completes the authorization.
   * - `interrupt`: The tool execution is interrupted until the user completes the authorization.
   *
   * Defaults to `interrupt`.
   * Note: The block mode is only useful for development purposes and should not be used in production.
   */
  onAuthorizationRequest?: OnAuthorizationRequest;
} & (
  | {
      onAuthorizationRequest: "block";

      /**
       *
       * Optional callback to generate a tool result when the invocation is not authorized.
       *
       * @param args - The tool execution arguments.
       * @returns The response to return when the invocation is not authorized.
       */
      onUnauthorized?: (
        err: Error | CIBAInterrupt,
        ...args: ToolExecuteArgs
      ) => any;
    }
  | {
      onAuthorizationRequest?: "interrupt";

      /**
       * Retrieves the authorization response data.
       * @param args - The tool execution arguments.
       * @returns The authorization response data.
       * @remarks The data should be stored in a way that it can be retrieved later by the `storeAuthorizationResponse` parameter.
       */
      getAuthorizationResponse: AuthorizerToolParameter<
        ToolExecuteArgs,
        CIBAAuthorizationRequest | undefined
      >;

      /**
       * Stores the authorization response data.
       * @param request - The authorization response data.
       * @param args - The tool execution arguments.
       * @returns A promise that resolves when the data is stored.
       * @remarks The data should be stored in a way that it can be retrieved later by the `getAuthorizationResponse` parameter.
       **/
      storeAuthorizationResponse: (
        request: CIBAAuthorizationRequest,
        ...args: ToolExecuteArgs
      ) => Promise<void>;
    }
);
