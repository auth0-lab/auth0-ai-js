import { Tool } from "ai";

import { MemoryStore, Store, SubStore } from "@auth0/ai/stores";

import { CIBAAuthorizer } from "./CIBA";
import { DeviceAuthorizer } from "./Device";
import { FederatedConnectionAuthorizer } from "./FederatedConnections";
import { FGA_AI } from "./FGA_AI";

import type { AuthorizerParams } from "@auth0/ai";
type ToolWrapper = ReturnType<FederatedConnectionAuthorizer["authorizer"]>;
type FederatedConnectionParams = Omit<
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
  withAsyncUserConfirmation(params: CIBAParams, tool: Tool): Tool;

  withAsyncUserConfirmation(params: CIBAParams, tool?: Tool) {
    const cibaStore = this.store.createSubStore("AUTH0_AI_CIBA");
    const fc = new CIBAAuthorizer(this.config, { store: cibaStore, ...params });
    const authorizer = fc.authorizer();
    if (tool) {
      return authorizer(tool);
    }
    return authorizer;
  }

  /**
   * Builds a Federated Connection authorizer for a tool.
   *
   * @param params - The Federated Connections authorizer options.
   * @returns The authorizer.
   */
  withTokenForConnection(params: FederatedConnectionParams): ToolWrapper;

  /**
   * Protects a tool execution with the Federated Connection authorizer.
   *
   * @param params - The Federated Connections authorizer options.
   * @param tool - The tool to protect.
   * @returns The protected tool.
   */
  withTokenForConnection(params: FederatedConnectionParams, tool: Tool): Tool;

  withTokenForConnection(params: FederatedConnectionParams, tool?: Tool) {
    const store = this.store.createSubStore("AUTH0_AI_FEDERATED_CONNECTION");
    const fc = new FederatedConnectionAuthorizer(this.config, {
      store,
      ...params,
    });
    const authorizer = fc.authorizer();
    if (tool) {
      return authorizer(tool);
    }
    return authorizer;
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
  withDeviceAuthorizationFlow(params: DeviceParams, tool: Tool): Tool;

  withDeviceAuthorizationFlow(params: DeviceParams, tool?: Tool) {
    const deviceStore = this.store.createSubStore("AUTH0_AI_DEVICE_FLOW");
    const fc = new DeviceAuthorizer(this.config, {
      store: deviceStore,
      ...params,
    });
    const authorizer = fc.authorizer();
    if (tool) {
      return authorizer(tool);
    }
    return authorizer;
  }

  static FGA = FGA_AI;
}
