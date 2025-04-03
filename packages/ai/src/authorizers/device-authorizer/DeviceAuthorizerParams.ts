import { TokenSet } from "../../credentials";
import { DeviceInterrupt } from "../../interrupts/DeviceInterrupts";
import { Store } from "../../stores";
import { AuthContext } from "../context";
import { OnAuthorizationRequest } from "../types";
import { DeviceAuthorizationResponse } from "./DeviceAuthResponse";

/**
 * The parameters for the DeviceAuthorizer.
 */
export type DeviceAuthorizerParams<ToolExecuteArgs extends any[]> = {
  /**
   * The scopes to request.
   */
  scopes: string[];

  /**
   * The audience to request.
   */
  audience?: string;

  /**
   * The authorization response store.
   * Allows to store the authorization response for resuming the tool execution
   * after the interrupt.
   */
  store: Store;

  /**
   * AuthContext defines the scope of credential sharing:
   * - "tool-call": Credentials are valid only for a single invocation of the tool.
   * - "tool": Credentials are shared across multiple calls to the same tool within the same thread.
   * - "thread": Credentials are shared across all tools using the same authorizer within the current thread.
   * - "agent": Credentials are shared globally across all threads and tools in the agent.
   *
   * @default "thread"
   */
  credentialsContext?: AuthContext;

  /**
   * The behavior when the authorization request is made.
   *
   * - `block`: The tool execution is blocked until the user completes the authorization.
   * - `interrupt`: The tool execution is interrupted until the user completes the authorization.
   * - a callback: Same as "block" but give access to the auth request this allow you
   *               to show the link/code and open the browser
   *
   * Defaults to `interrupt`.
   * Note: The block mode is only useful for development purposes and should not be used in production.
   */
  onAuthorizationRequest?:
    | OnAuthorizationRequest
    | ((
        authReq: DeviceAuthorizationResponse,
        poll: Promise<TokenSet | undefined>
      ) => Promise<void>);

  /**
   *
   * A callback that is called when the authorization request is unsuccessful.
   *
   * @param err - The error that occurred.
   * @param args - The tool execution arguments.
   * @returns - The final response the tool will return.
   */
  onUnauthorized?: (
    err: Error | DeviceInterrupt,
    ...args: ToolExecuteArgs
  ) => any;
};

export type { DeviceAuthorizationResponse };
