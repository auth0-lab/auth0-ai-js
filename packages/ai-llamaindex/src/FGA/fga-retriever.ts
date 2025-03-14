import {
  BaseRetriever,
  Metadata,
  NodeWithScore,
  QueryBundle,
} from "llamaindex";

import { ClientBatchCheckItem, ConsistencyPreference } from "@openfga/sdk";
import { FGAFilter, FGAClientParams } from "@auth0/ai";

export type FGARetrieverCheckerFn = (
  doc: NodeWithScore<Metadata>
) => ClientBatchCheckItem;

export interface FGARetrieverArgs {
  buildQuery: FGARetrieverCheckerFn;
  retriever: BaseRetriever;
  consistency?: ConsistencyPreference;
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

  private fgaFilter: FGAFilter<NodeWithScore<Metadata>>;

  static lc_name() {
    return "FGARetriever";
  }

  private constructor(
    { buildQuery, retriever, consistency }: FGARetrieverArgs,
    fgaClientParams?: FGAClientParams
  ) {
    super();

    this.retriever = retriever;
    this.fgaFilter = FGAFilter.create(
      {
        buildQuery,
        consistency: consistency || ConsistencyPreference.HigherConsistency,
      },
      fgaClientParams
    );
  }

  /**
   * Creates a new FGARetriever instance using the given arguments and optional OpenFgaClient.
   *
   * @param args - @FGARetrieverArgs
   * @param args.retriever - The underlying retriever instance to fetch documents.
   * @param args.buildQuery - A function to generate access check requests for each document.
   * @param args.consistency - Optional - The consistency preference for the OpenFGA client.
   * @param fgaClientParams - Optional - OpenFgaClient configuration to execute checks against.
   * @returns A newly created FGARetriever instance configured with the provided arguments.
   */
  static create(args: FGARetrieverArgs, fgaClientParams?: FGAClientParams) {
    return new FGARetriever(args, fgaClientParams);
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

    const result = await this.fgaFilter.filter(retrievedNodes);
    return result;
  }
}
