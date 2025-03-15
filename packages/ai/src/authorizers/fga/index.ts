import {
  ClientCheckRequest,
  ConsistencyPreference,
  OpenFgaClient,
} from "@openfga/sdk";

import { buildOpenFgaClient, FGAClientParams } from "./fga-client";

export type FGAAuthorizerOptions<ToolExecuteArgs extends any[]> = {
  buildQuery: (...args: ToolExecuteArgs) => Promise<ClientCheckRequest>;
  onUnauthorized?: (...args: ToolExecuteArgs) => any;
};

export class FGAAuthorizerBase<ToolExecuteArgs extends any[]> {
  fgaClient: OpenFgaClient;

  constructor(
    fgaClientParams: FGAClientParams | undefined | null,
    private authorizeOptions: FGAAuthorizerOptions<ToolExecuteArgs>
  ) {
    this.fgaClient = buildOpenFgaClient(fgaClientParams);
  }

  /**
   *
   * Wraps the execute method of an AI tool to handle FGA authorization.
   *
   * @param execute - The tool execute method.
   * @returns The wrapped execute method.
   */
  protect(
    execute: (...args: ToolExecuteArgs) => any
  ): (...args: ToolExecuteArgs) => any {
    return async (...args: ToolExecuteArgs) => {
      const check = await this.authorizeOptions.buildQuery(...args);
      const { allowed } = await this.fgaClient.check(check, {
        consistency: ConsistencyPreference.HigherConsistency,
      });
      if (!allowed) {
        if (typeof this.authorizeOptions.onUnauthorized === "function") {
          return this.authorizeOptions.onUnauthorized(...args);
        } else {
          return "The user is not allowed to perform the action.";
        }
      }
      return execute(...args);
    };
  }
}
