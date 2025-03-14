import {
  ClientBatchCheckItem,
  ConsistencyPreference,
  CredentialsMethod,
  OpenFgaClient,
} from "@openfga/sdk";

export type FGARetrieverCheckerFn<T extends Record<string, any>> = (
  doc: T
) => ClientBatchCheckItem;

export type FGARetrieverArgs<T extends Record<string, any>> = {
  buildQuery: FGARetrieverCheckerFn<T>;
  consistency?: ConsistencyPreference;
};

/**
 * A retriever that allows filtering documents based on access control checks
 * using OpenFGA. This class performs batch checks on passed documents,
 * returning only the ones that pass the specified access criteria.
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
 *   buildQuery: (doc) => ({
 *     user: `user:${user}`,
 *     object: `doc:${doc.metadata.id}`,
 *     relation: "viewer",
 *   }),
 * });
 * ```
 */
export class FGARetriever<T extends Record<string, any>> {
  lc_namespace = ["retrievers"];
  private buildQuery: FGARetrieverCheckerFn<T>;
  private consistency: ConsistencyPreference;
  private fgaClient: OpenFgaClient;

  private constructor(
    { buildQuery, consistency }: FGARetrieverArgs<T>,
    fgaClient?: OpenFgaClient
  ) {
    this.buildQuery = buildQuery;
    this.consistency = consistency || ConsistencyPreference.HigherConsistency;
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
   * @param args.buildQuery - A function to generate access check requests for each document.
   * @param args.consistency - Optional - The consistency preference for the OpenFGA client.
   * @param fgaClient - Optional - OpenFgaClient instance to execute checks against.
   * @returns A newly created FGARetriever instance configured with the provided arguments.
   */
  static create<T extends Record<string, any>>(
    args: FGARetrieverArgs<T>,
    fgaClient?: OpenFgaClient
  ): FGARetriever<T> {
    return new FGARetriever(args, fgaClient);
  }

  /**
   * Retrieves documents based on the provided query parameters, processes
   * them through a checker function,
   * and filters the documents based on permissions.
   *
   * @param params - The query parameters used to retrieve nodes.
   * @returns A promise that resolves to an array of documents that have passed the permission checks.
   */
  async retrieve(documents: T[]): Promise<T[]> {
    const { checks, documentToObject } = documents.reduce(
      (acc, doc) => {
        const check = this.buildQuery(doc);
        const checkKey = this.getCheckKey(check);
        acc.documentToObject.set(doc, checkKey);
        // Skip duplicate checks for same user, object, and relation
        if (!acc.seenChecks.has(checkKey)) {
          acc.seenChecks.add(checkKey);
          acc.checks.push(check);
        }
        return acc;
      },
      {
        checks: [] as ClientBatchCheckItem[],
        documentToObject: new Map<T, string>(),
        seenChecks: new Set<string>(),
      }
    );

    const permissionsMap = await this.checkPermissions(checks);

    return documents.filter(
      (d) => permissionsMap.get(documentToObject.get(d) || "") === true
    );
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
        consistency: this.consistency,
      }
    );

    return response.result.reduce(
      (permissionMap: Map<string, boolean>, result) => {
        const checkKey = this.getCheckKey(result.request);
        permissionMap.set(checkKey, result.allowed || false);
        return permissionMap;
      },
      new Map<string, boolean>()
    );
  }

  private getCheckKey(check: ClientBatchCheckItem): string {
    return `${check.user}|${check.object}|${check.relation}`;
  }
}
