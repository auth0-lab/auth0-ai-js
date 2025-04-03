import { AuthenticationClientOptions } from "auth0";
import { z } from "genkit";
import { GenkitBeta } from "genkit/beta";

import { MemoryStore, Store, SubStore } from "@auth0/ai/stores";

import { CIBAAuthorizer } from "./CIBA";
import { DeviceAuthorizer } from "./Device/DeviceAuthorizer";
import { FederatedConnectionAuthorizer } from "./FederatedConnections";
import { FGA_AI } from "./FGA_AI";

import type { ToolAction } from "@genkit-ai/ai/tool";
import type { ToolWrapper } from "./lib";
type AuthorizerParams = Pick<
  AuthenticationClientOptions,
  "domain" | "clientId" | "clientSecret"
>;

export type CIBAParams = Omit<
  ConstructorParameters<typeof CIBAAuthorizer>[2],
  "store"
>;

export type DeviceParams = Omit<
  ConstructorParameters<typeof DeviceAuthorizer>[2],
  "store"
>;

export type FederatedConnectionParams = Omit<
  ConstructorParameters<typeof FederatedConnectionAuthorizer>[2],
  "store"
>;

type Auth0AIParams = {
  auth0?: Partial<AuthorizerParams>;
  store?: Store;
  genkit: GenkitBeta;
};

export class Auth0AI {
  private config: Partial<AuthorizerParams>;
  private store: SubStore;
  private genkit: GenkitBeta;

  constructor({ auth0, store, genkit }: Auth0AIParams) {
    this.config = auth0 ?? {};
    this.store = new SubStore(store ?? new MemoryStore());
    this.genkit = genkit;
  }

  /**
   *
   * Returns a tool authorizer that protects the tool
   * with the Client Initiated Base Authentication (CIBA) authorization control.
   *
   * @param params - The parameters for the CIBA authorization control.
   * @returns A tool authorizer.
   */
  withAsyncUserConfirmation(params: CIBAParams): ToolWrapper;

  /**
   *
   * Protects a tool function with Client Initiated Base Authentication (CIBA) authorization control.
   *
   * @param params - The parameters for the CIBA authorization control.
   * @param tool - The tool to protect.
   * @returns The protected tool.
   */
  withAsyncUserConfirmation<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
    params: CIBAParams,
    tool?: ToolAction<I, O>
  ): ToolAction<I, O>;

  /**
   *
   * Builds an Client Initiated Base Authentication (CIBA) authorizer for a tool.
   * if a tool is provided, the authorizer is applied to the tool.
   * @param params - The parameters for the FGA authorization control.
   * @param tool - The tool function to protect.
   * @returns
   */
  withAsyncUserConfirmation<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
    params: CIBAParams,
    tool?: ToolAction<I, O>
  ) {
    const cibaStore = this.store.createSubStore("AUTH0_AI_CIBA");
    const authorizer = new CIBAAuthorizer(this.genkit, this.config, {
      store: cibaStore,
      ...params,
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
  withDeviceAuthorizationFlow<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
    params: DeviceParams,
    tool?: ToolAction<I, O>
  ): ToolAction<I, O>;

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
  withDeviceAuthorizationFlow<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
    params: DeviceParams,
    tool?: ToolAction<I, O>
  ) {
    const deviceAuthorizerStore = this.store.createSubStore(
      "AUTH0_AI_DEVICE_FLOW"
    );
    const authorizer = new DeviceAuthorizer(this.genkit, this.config, {
      store: deviceAuthorizerStore,
      ...params,
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
  withTokenForConnection(params: FederatedConnectionParams): ToolWrapper;

  /**
   * Protects a tool with the Federated Connection authorizer.
   *
   * @param params - The Federated Connections authorizer options.
   * @param tool - The tool to protect.
   * @returns The protected tool.
   */
  withTokenForConnection<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
    params: FederatedConnectionParams,
    tool: ToolAction<I, O>
  ): ToolAction<I, O>;

  withTokenForConnection<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
    params: FederatedConnectionParams,
    tool?: ToolAction<I, O>
  ) {
    const store = this.store.createSubStore("AUTH0_AI_FEDERATED_CONNECTION");
    const fc = new FederatedConnectionAuthorizer(this.genkit, this.config, {
      store,
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
