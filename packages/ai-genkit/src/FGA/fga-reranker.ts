import { Document, Genkit, z } from "genkit";
import { GenkitPlugin, genkitPlugin } from "genkit/plugin";

import { ClientBatchCheckItem, ConsistencyPreference } from "@openfga/sdk";
import { FGAFilter, FGAClientParams } from "@auth0/ai";

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

  static lc_name() {
    return "FGAReranker";
  }

  private fgaFilter: FGAFilter;

  private constructor(
    { buildQuery, consistency }: FGARerankerConstructorArgs,
    fgaClientParams?: FGAClientParams
  ) {
    this.fgaFilter = new FGAFilter(
      {
        buildQuery,
        consistency,
      },
      fgaClientParams
    );
  }

  /**
   * Creates a new FGAReranker instance using the given arguments and optional OpenFgaClient.
   *
   * @param args - @FGARerankerArgs
   * @param args.ai - A Genkit Instance.
   * @param args.buildQuery - A function to generate access check requests for each document.
   * @param fgaClientParams - Optional - OpenFgaClient configuration to execute checks against.
   * @returns A Reranker instance instance configured with the provided arguments.
   */
  static create(
    { ai, buildQuery }: FGARerankerArgs,
    fgaClientParams?: FGAClientParams
  ) {
    const client = new FGAReranker({ buildQuery }, fgaClientParams);

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
   * Retrieves a filtered list of documents based on permission checks.
   *
   * @param documents - An array of documents to be checked for permissions.
   * @returns A promise that resolves to an array of documents that have passed the permission checks.
   */
  private async filter(documents: Document[]): Promise<Array<Document>> {
    const result = await this.fgaFilter.filter(documents);
    return result;
  }
}

export function auth0(): GenkitPlugin {
  return genkitPlugin("auth0", async () => {
    // Define the FGAReranker
  });
}
