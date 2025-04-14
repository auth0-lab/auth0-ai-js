import { DynamicStructuredTool } from "langchain/tools";

import { AuthorizerParams } from "@auth0/ai";
import { MemoryStore, Store, SubStore } from "@auth0/ai/stores";

import { CIBAAuthorizer } from "./ciba";
import { DeviceAuthorizer } from "./Device";
import { FederatedConnectionAuthorizer } from "./FederatedConnections";
import { FGA_AI } from "./FGA_AI";
import { CommunityToolWrapper, ToolWrapper } from "./util/ToolWrapper";

export type FederatedConnectionAuthorizerParams = Omit<
  ConstructorParameters<typeof FederatedConnectionAuthorizer>[1],
  "store"
>;

export type CIBAParams = Omit<
  ConstructorParameters<typeof CIBAAuthorizer>[1],
  "store"
>;

export type DeviceParams = Omit<
  ConstructorParameters<typeof DeviceAuthorizer>[1],
  "store"
>;

type Auth0AIParams = {
  auth0?: Partial<AuthorizerParams>;
  store?: Store;
};

export class Auth0AI {
  private config: Partial<AuthorizerParams>;
  private store: SubStore;

  constructor({ auth0, store }: Auth0AIParams = {}) {
    this.config = auth0 ?? {};
    this.store = new SubStore(store ?? new MemoryStore());
  }

  /**
   * Builds a CIBA Authorizer for a tool.
   * @param params - The CIBA authorizer options.
   * @returns - The authorizer.
   */
  withAsyncUserConfirmation(params: CIBAParams): ToolWrapper;

  /**
   * Protects a tool with the CIBA authorizer.
   * @param params - The CIBA authorizer options.
   * @param tool - The tool to protect.
   * @returns The protected tool.
   */
  withAsyncUserConfirmation(
    params: CIBAParams,
    tool: DynamicStructuredTool
  ): DynamicStructuredTool;

  /**
   *
   * Builds a CIBA Authorizer for a tool.
   * If a tool is provided, it will be protected with the CIBA authorizer.
   * Otherwise the authorizer will be returned.
   *
   * @param options - The CIBA authorizer options.
   * @param [tool] - The tool to protect.
   * @returns The authorizer or the protected tool.
   */
  withAsyncUserConfirmation(options: CIBAParams, tool?: DynamicStructuredTool) {
    const cibaStore = this.store.createSubStore("AUTH0_AI_CIBA");
    const authorizer = new CIBAAuthorizer(this.config, {
      store: cibaStore,
      ...options,
    });
    if (tool) {
      return authorizer.authorizer()(tool);
    }
    return authorizer.authorizer();
  }

  /**
   * Builds a Federated Connection authorizer for a tool.
   *
   * @param params - The Federated Connections authorizer options.
   * @returns The authorizer.
   */
  withTokenForConnection(
    params: FederatedConnectionAuthorizerParams
  ): ToolWrapper;

  /**
   * Protects a tool execution with the Federated Connection authorizer.
   *
   * @param params - The Federated Connections authorizer options.
   * @param tool - The tool to protect.
   * @returns The protected tool.
   */
  withTokenForConnection(
    params: FederatedConnectionAuthorizerParams,
    tool: DynamicStructuredTool
  ): DynamicStructuredTool;

  /**
   * Protects a tool execution with the Federated Connection authorizer.
   *
   * @param options - The Federated Connections authorizer options.
   * @returns The authorizer.
   */
  withTokenForConnection(
    options: FederatedConnectionAuthorizerParams,
    tool?: DynamicStructuredTool
  ) {
    const store = this.store.createSubStore("AUTH0_AI_FEDERATED_CONNECTION");
    const authorizer = new FederatedConnectionAuthorizer(this.config, {
      store,
      ...options,
    });
    if (tool) {
      return authorizer.authorizer()(tool);
    }
    return authorizer.authorizer();
  }

  withTokenForCommunityTool(
    options: FederatedConnectionAuthorizerParams,
    toolWrapper?: CommunityToolWrapper
  ) {
    const store = this.store.createSubStore("AUTH0_AI_FEDERATED_CONNECTION");
    const authorizer = new FederatedConnectionAuthorizer(this.config, {
      store,
      ...options,
    });
    if (toolWrapper) {
      return authorizer.authorizerForCommunityTool()(toolWrapper);
    }
    return authorizer.authorizerForCommunityTool();
  }

  /**
   * Builds a Device Flow Authorizer for a tool.
   *
   * @param params - The Device Flow Authorizer options.
   * @returns - The authorizer.
   */
  withDeviceAuthorizationFlow(params: DeviceParams): ToolWrapper;

  /**
   * Protects a tool with the Device Flow Authorizer.
   * @param params - The Device Flow Authorizer options.
   * @param tool - The tool to protect.
   * @returns The protected tool.
   */
  withDeviceAuthorizationFlow(
    params: DeviceParams,
    tool: DynamicStructuredTool
  ): DynamicStructuredTool;

  /**
   *
   * Builds a Device Flow Authorizer for a tool.
   * If a tool is provided, it will be protected with the Device Flow Authorizer.
   * Otherwise the authorizer will be returned.
   *
   * @param options - The Device Flow Authorizer options.
   * @param [tool] - The tool to protect.
   * @returns The authorizer or the protected tool.
   */
  withDeviceAuthorizationFlow(
    options: DeviceParams,
    tool?: DynamicStructuredTool
  ) {
    const deviceAuthorizerStore = this.store.createSubStore(
      "AUTH0_AI_DEVICE_FLOW"
    );
    const authorizer = new DeviceAuthorizer(this.config, {
      store: deviceAuthorizerStore,
      ...options,
    });
    if (tool) {
      return authorizer.authorizer()(tool);
    }
    return authorizer.authorizer();
  }

  static FGA = FGA_AI;
}
