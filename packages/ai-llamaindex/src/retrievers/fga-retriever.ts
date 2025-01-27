import {
  BaseNode,
  BaseRetriever,
  Metadata,
  NodeWithScore,
  QueryBundle,
} from "llamaindex";

import {
  ClientBatchCheckItem,
  ConsistencyPreference,
  CredentialsMethod,
  OpenFgaClient,
} from "@openfga/sdk";

export type FGARetrieverCheckerFn = (
  doc: BaseNode<Metadata>
) => ClientBatchCheckItem;

export interface FGARetrieverArgs {
  buildQuery: FGARetrieverCheckerFn;
  retriever: BaseRetriever;
}

/**
 * A retriever that allows filtering documents based on access control checks
 * using OpenFGA. This class wraps an underlying retriever and performs batch
 * checks on retrieved documents, returning only the ones that pass the
 * specified access criteria.
 *
 *
 * @remarks
 * The FGARetriever requires a buildQuery function to specify how access checks
 * are formed for each document, the checks are executed via an OpenFGA client
 * or equivalent mechanism. The checks are then mapped back to their corresponding
 * documents to filter out those for which access is denied.
 *
 * @example
 * ```ts
 * const retriever = FGARetriever.create({
 *   retriever: someOtherRetriever,
 *   buildQuery: (doc) => ({
 *     user: `user:${user}`,
 *     object: `doc:${doc.metadata.id}`,
 *     relation: "viewer",
 *   }),
 * });
 * ```
 */
export class FGARetriever extends BaseRetriever {
  lc_namespace = ["llamaindex", "retrievers", "fga-retriever"];
  private retriever: BaseRetriever;
  private buildQuery: FGARetrieverCheckerFn;
  private fgaClient: OpenFgaClient;

  static lc_name() {
    return "FGARetriever";
  }

  private constructor(
    { buildQuery, retriever }: FGARetrieverArgs,
    fgaClient?: OpenFgaClient
  ) {
    super();

    this.retriever = retriever;
    this.buildQuery = buildQuery;
    this.fgaClient =
      fgaClient ||
      new OpenFgaClient({
        apiUrl: process.env.FGA_API_URL || "https://api.us1.fga.dev",
        storeId: process.env.FGA_STORE_ID!,
        credentials: {
          method: CredentialsMethod.ClientCredentials,
          config: {
            apiTokenIssuer: process.env.FGA_API_TOKEN_ISSUER || "auth.fga.dev",
            apiAudience:
              process.env.FGA_API_AUDIENCE || "https://api.us1.fga.dev/",
            clientId: process.env.FGA_CLIENT_ID!,
            clientSecret: process.env.FGA_CLIENT_SECRET!,
          },
        },
      });
  }

  /**
   * Creates a new FGARetriever instance using the given arguments and optional OpenFgaClient.
   *
   * @param args - @FGARetrieverArgs
   * @param args.retriever - The underlying retriever instance to fetch documents.
   * @param args.buildQuery - A function to generate access check requests for each document.
   * @param fgaClient - Optional - OpenFgaClient instance to execute checks against.
   * @returns A newly created FGARetriever instance configured with the provided arguments.
   */
  static create(
    { buildQuery, retriever }: FGARetrieverArgs,
    fgaClient?: OpenFgaClient
  ) {
    return new FGARetriever({ buildQuery, retriever }, fgaClient);
  }

  /**
   * Checks permissions for a list of client requests.
   *
   * @param checks - An array of `ClientBatchCheckItem` objects representing the permissions to be checked.
   * @returns A promise that resolves to a `Map` where the keys are object identifiers and the values are booleans indicating whether the permission is allowed.
   */
  private async checkPermissions(
    checks: ClientBatchCheckItem[]
  ): Promise<Map<string, boolean>> {
    const response = await this.fgaClient.batchCheck(
      { checks },
      {
        consistency: ConsistencyPreference.HigherConsistency,
      }
    );

    return response.result.reduce(
      (permissionMap: Map<string, boolean>, result) => {
        permissionMap.set(result.request.object, result.allowed || false);
        return permissionMap;
      },
      new Map<string, boolean>()
    );
  }

  /**
   * Retrieves nodes based on the provided query parameters, processes
   * them through a checker function,
   * and filters the nodes based on permissions.
   *
   * @param params - The query parameters used to retrieve nodes.
   * @returns A promise that resolves to an array of nodes with scores that have passed the permission checks.
   */
  async _retrieve(params: QueryBundle): Promise<NodeWithScore[]> {
    const retrievedNodes = await this.retriever.retrieve(params);

    const { checks, documentToObjectMap } = retrievedNodes.reduce(
      (acc, nodeWithScore: NodeWithScore<Metadata>) => {
        const check = this.buildQuery(nodeWithScore.node);
        acc.documentToObjectMap.set(nodeWithScore, check.object);
        // Skip duplicate checks for same user, object, and relation
        const checkKey = `${check.user}|${check.object}|${check.relation}`;
        if (!acc.seenChecks.has(checkKey)) {
          acc.seenChecks.add(checkKey);
          acc.checks.push(check);
        }
        return acc;
      },
      {
        checks: [] as ClientBatchCheckItem[],
        documentToObjectMap: new Map<NodeWithScore<Metadata>, string>(),
        seenChecks: new Set<string>(),
      }
    );

    const permissionsMap = await this.checkPermissions(checks);

    return retrievedNodes.filter(
      (node) => permissionsMap.get(documentToObjectMap.get(node) || "") === true
    );
  }
}
