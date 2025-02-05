import { Document, Genkit, z } from "genkit";
import { GenkitPlugin, genkitPlugin } from "genkit/plugin";

import {
  ClientBatchCheckItem,
  ConsistencyPreference,
  CredentialsMethod,
  OpenFgaClient,
} from "@openfga/sdk";

export type FGARerankerCheckerFn = (doc: Document) => ClientBatchCheckItem;

export type FGARerankerConstructorArgs = {
  buildQuery: FGARerankerCheckerFn;
  consistency?: ConsistencyPreference;
};

export type FGARerankerArgs = FGARerankerConstructorArgs & {
  ai: Genkit;
};

/**
 * A Reranker that allows filtering documents based on access control checks
 * using OpenFGA. This class performs batch checks on retrieved documents, returning only the ones that pass the
 * specified access criteria. ALl filtered docs have maximum score of 1.
 *
 *
 * @remarks
 * The FGAReranker requires a buildQuery function to specify how access checks
 * are formed for each document, the checks are executed via an OpenFGA client
 * or equivalent mechanism. The checks are then mapped back to their corresponding
 * documents to filter out those for which access is denied.
 *
 * @example
 * ```ts
 * const reranker = FGAReranker.create({
 *   ai,
 *   buildQuery: (doc) => ({
 *     user: `user:${user}`,
 *     object: `doc:${doc.metadata.id}`,
 *     relation: "viewer",
 *   }),
 * });
 * ```
 */
export class FGAReranker {
  lc_namespace = ["genkit", "rerankers", "fga-reranker"];
  private buildQuery: FGARerankerCheckerFn;
  private consistency: ConsistencyPreference;
  private fgaClient: OpenFgaClient;

  static lc_name() {
    return "FGAReranker";
  }

  private constructor(
    { buildQuery, consistency }: FGARerankerConstructorArgs,
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
   * Creates a new FGAReranker instance using the given arguments and optional OpenFgaClient.
   *
   * @param args - @FGARerankerArgs
   * @param args.ai - A Genkit Instance.
   * @param args.buildQuery - A function to generate access check requests for each document.
   * @param fgaClient - Optional - OpenFgaClient instance to execute checks against.
   * @returns A Reranker instance instance configured with the provided arguments.
   */
  static create(
    { ai, buildQuery }: FGARerankerArgs,
    fgaClient?: OpenFgaClient
  ) {
    const client = new FGAReranker({ buildQuery }, fgaClient);

    const fgaReranker = ai.defineReranker(
      {
        name: `auth0/fga-reranker`,
        configSchema: z.object({
          k: z.number().optional(),
        }),
      },
      async (_query, documents, options) => {
        const filteredDocuments = await client.filter(documents);
        const rankedDocuments = filteredDocuments
          // add score to filtered documents
          .map((doc) => {
            const score = 1; // give maximum score to filtered docs
            return {
              ...doc,
              metadata: { ...doc.metadata, score },
            };
          })
          .slice(
            0,
            // if `k` is not provided, return all filtered documents
            options && options.k ? options.k : undefined
          );

        return {
          documents: rankedDocuments,
        };
      }
    );

    return fgaReranker;
  }

  /**
   * Checks permissions for a list of client requests.
   *
   * @param requests - An array of `ClientBatchCheckItem` objects representing the permissions to be checked.
   * @returns A promise that resolves to a `Map` where the keys are object identifiers and the values are booleans indicating whether the permission is allowed.
   */
  private async checkPermissions(
    checks: ClientBatchCheckItem[]
  ): Promise<Map<string, boolean>> {
    const response = await this.fgaClient.batchCheck(
      { checks },
      {
        consistency:
          this.consistency || ConsistencyPreference.HigherConsistency,
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

  /**
   * Retrieves a filtered list of documents based on permission checks.
   *
   * @param documents - An array of documents to be checked for permissions.
   * @returns A promise that resolves to an array of documents that have passed the permission checks.
   */
  private async filter(documents: Document[]): Promise<Array<Document>> {
    const { checks, documentToObjectMap } = documents.reduce(
      (acc, document: Document) => {
        const check = this.buildQuery(document);
        const checkKey = this.getCheckKey(check);
        acc.documentToObjectMap.set(document, checkKey);
        // Skip duplicate checks for same user, object, and relation
        if (!acc.seenChecks.has(checkKey)) {
          acc.seenChecks.add(checkKey);
          acc.checks.push(check);
        }
        return acc;
      },
      {
        checks: [] as ClientBatchCheckItem[],
        documentToObjectMap: new Map<Document, string>(),
        seenChecks: new Set<string>(),
      }
    );

    const permissionsMap = await this.checkPermissions(checks);

    return documents.filter(
      (document) =>
        permissionsMap.get(documentToObjectMap.get(document) || "") === true
    );
  }
}

export function auth0(): GenkitPlugin {
  return genkitPlugin("auth0", async () => {
    // Define the FGAReranker
  });
}
