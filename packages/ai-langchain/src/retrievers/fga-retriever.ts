import { Document, DocumentInterface } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import {
  ClientBatchCheckItem,
  ConsistencyPreference,
  CredentialsMethod,
  OpenFgaClient,
} from "@openfga/sdk";

import type { BaseRetrieverInput } from "@langchain/core/retrievers";
import type { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import { StructuredToolInterface, tool } from "@langchain/core/tools";
import { z } from "zod";

export type FGARetrieverCheckerFn = (
  doc: DocumentInterface<Record<string, any>>
) => ClientBatchCheckItem;

export type FGARetrieverArgs = {
  retriever: BaseRetriever;
  buildQuery: FGARetrieverCheckerFn;
  fields?: BaseRetrieverInput;
};

type AccessByDocumentFn = (
  checks: ClientBatchCheckItem[]
) => Promise<Map<string, boolean>>;

type FGARetrieverArgsWithAccessByDocument = FGARetrieverArgs & {
  accessByDocument: AccessByDocumentFn;
};

/**
 * A retriever that allows filtering documents based on access control checks
 * using OpenFGA. This class wraps an underlying retriever and performs batch
 * checks on retrieved documents, returning only the ones that pass the
 * specified access criteria.
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
  lc_namespace = ["@langchain", "retrievers"];
  private retriever: BaseRetriever;
  private buildQuery: FGARetrieverCheckerFn;
  private accessByDocument: AccessByDocumentFn;

  private constructor({
    retriever,
    buildQuery,
    fields,
    accessByDocument,
  }: FGARetrieverArgsWithAccessByDocument) {
    super(fields);
    this.buildQuery = buildQuery;
    this.retriever = retriever;
    this.accessByDocument = accessByDocument as AccessByDocumentFn;
  }

  /**
   * Creates a new FGARetriever instance using the given arguments and optional OpenFgaClient.
   *
   * @param args - @FGARetrieverArgs
   * @param args.retriever - The underlying retriever instance to fetch documents.
   * @param args.buildQuery - A function to generate access check requests for each document.
   * @param args.fields - Optional - Additional fields to pass to the underlying retriever.
   * @param fgaClient - Optional - OpenFgaClient instance to execute checks against.
   * @returns A newly created FGARetriever instance configured with the provided arguments.
   */
  static create(
    args: FGARetrieverArgs,
    fgaClient?: OpenFgaClient
  ): FGARetriever {
    const client =
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

    const accessByDocument: AccessByDocumentFn = async function (checks) {
      const response = await client.batchCheck(
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
    };

    return new FGARetriever({ ...args, accessByDocument });
  }

  /**
   * Retrieves documents based on the provided query parameters, processes
   * them through a checker function,
   * and filters the documents based on permissions.
   *
   * @param params - The query parameters used to retrieve nodes.
   * @returns A promise that resolves to an array of documents that have passed the permission checks.
   */
  async _getRelevantDocuments(
    query: string,
    runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    const documents = await this.retriever._getRelevantDocuments(
      query,
      runManager
    );

    const { checks, documentToObject } = documents.reduce(
      (acc, doc) => {
        const check = this.buildQuery(doc);
        acc.documentToObject.set(doc, check.object);
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
        documentToObject: new Map<
          DocumentInterface<Record<string, any>>,
          string
        >(),
        seenChecks: new Set<string>(),
      }
    );

    const resultsByObject = await this.accessByDocument(checks);

    return documents.filter(
      (d, i) => resultsByObject.get(documentToObject.get(d) || "") === true
    );
  }

  /**
   * Converts the FGA retriever into a tool that can be used by a LangGraph agent.
   * @returns StructuredToolInterface.
   */
  asJoinedStringTool(): StructuredToolInterface {
    const retriever = this;
    return tool(
      async ({ query }) => {
        const documents = await retriever.invoke(query);
        return documents.map((doc) => doc.pageContent).join("\n\n");
      },
      {
        name: "fga-retriever-tool",
        description: "Returns the filtered documents page content as string.",
        schema: z.object({ query: z.string() }),
      }
    );
  }
}
