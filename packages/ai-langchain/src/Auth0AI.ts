import { Auth0ClientParams } from "@auth0/ai";
import { MemoryStore, Store, SubStore } from "@auth0/ai/stores";

import { CIBAAuthorizer } from "./ciba";
import { DeviceAuthorizer } from "./Device";
import { FederatedConnectionAuthorizer } from "./FederatedConnections";
import { FGA_AI } from "./FGA_AI";
import { ToolLike, ToolWrapper } from "./util/ToolWrapper";

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
  auth0?: Partial<Auth0ClientParams>;
  store?: Store;
};

export class Auth0AI {
  private config: Partial<Auth0ClientParams>;
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
  withAsyncUserConfirmation<ToolType extends ToolLike>(
    params: CIBAParams,
    tool: ToolType
  ): ToolType;

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
  withAsyncUserConfirmation<ToolType extends ToolLike>(
    options: CIBAParams,
    tool?: ToolType
  ) {
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
  withTokenForConnection<ToolType extends ToolLike>(
    params: FederatedConnectionAuthorizerParams,
    tool: ToolType
  ): ToolType;

  /**
   * Protects a tool execution with the Federated Connection authorizer.
   *
   * @param options - The Federated Connections authorizer options.
   * @returns The authorizer.
   */
  withTokenForConnection<ToolType extends ToolLike>(
    options: FederatedConnectionAuthorizerParams,
    tool?: ToolType
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
  withDeviceAuthorizationFlow<ToolType extends ToolLike>(
    params: DeviceParams,
    tool: ToolType
  ): ToolType;

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
  withDeviceAuthorizationFlow<ToolType extends ToolLike>(
    options: DeviceParams,
    tool?: ToolType
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
