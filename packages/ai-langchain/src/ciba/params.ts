import { AuthorizerToolParameter } from "@auth0/ai";
import { CIBAAuthorizationRequest, CIBAAuthorizerBase } from "@auth0/ai/CIBA";
import { CIBAInterrupt } from "@auth0/ai/interrupts";
import { BaseStore, LangGraphRunnableConfig } from "@langchain/langgraph";

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

  /**
   * A LangGraph store to use for storing the
   * authorization request when the graph is interrupted.
   */
  store?: BaseStore;
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
  | ({
      onAuthorizationRequest?: "interrupt";
    } & (
      | {
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
      | {
          /**
           * A LangGraph store to use for storing the
           * authorization request when the graph is interrupted.
           */
          store: BaseStore;
        }
    ))
);

type BaseCIBAParams = ConstructorParameters<typeof CIBAAuthorizerBase>[1];

export const handleLangGraphStore = (
  config: CIBAAuthorizerParams<[any, LangGraphRunnableConfig]>
): BaseCIBAParams => {
  if (typeof config.store === "undefined") {
    return config as BaseCIBAParams;
  }
  const { store, ...rest } = config;
  return {
    ...rest,
    onAuthorizationRequest: "interrupt",
    getAuthorizationResponse: async (_params, config) => {
      const { metadata } = config;
      const { tool_call_id } = config.configurable ?? {};
      const { thread_id } = metadata ?? {};
      const item = await store.get(
        [thread_id, tool_call_id, "AUTH0_AI_CIBA"],
        "auth_request"
      );
      return item?.value as CIBAAuthorizationRequest;
    },
    storeAuthorizationResponse: async (
      authRequest,
      _params,
      config: LangGraphRunnableConfig
    ) => {
      const { metadata } = config;
      const { tool_call_id } = config.configurable ?? {};
      const { thread_id } = metadata ?? {};
      if (!authRequest) {
        await store.delete(
          [thread_id, tool_call_id, "AUTH0_AI_CIBA"],
          "auth_request"
        );
      } else {
        await store.put(
          [thread_id, tool_call_id, "AUTH0_AI_CIBA"],
          "auth_request",
          authRequest
        );
      }
    },
  };
};
