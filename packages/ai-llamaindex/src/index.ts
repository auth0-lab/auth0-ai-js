// Note: relies on patch to
// @llamaindex/core/agent/dist/index.js:L187,  throw e above  output = prettifyError(e);
// @llamaindex/core/agent/dist/index.cjs:L187,  throw e above  output = prettifyError(e);

import { FGA_AI } from "./FGA_AI";

export * from "./FGA/fga-retriever";

export class Auth0AI {
  static FGA = FGA_AI;
}
