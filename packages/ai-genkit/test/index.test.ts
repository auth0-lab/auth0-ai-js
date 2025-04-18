import { Document, genkit } from "genkit";
import { describe, expect, it, vi } from "vitest";

import { ConsistencyPreference, CredentialsMethod } from "@openfga/sdk";

import { auth0, FGAReranker } from "../src/FGA/fga-reranker";

describe("FGAReranker", async () => {
  process.env.FGA_CLIENT_ID = "client-id";
  process.env.FGA_CLIENT_SECRET = "client-secret";

  const ai = genkit({
    plugins: [auth0()],
  });

  const documents = [
    Document.fromText("public content", { id: "public-doc" }),
    Document.fromText("private content", { id: "private-doc" }),
  ];

  const mockBuildQuery = vi.fn((doc: Document) => ({
    object: `doc:${doc.metadata?.id}`,
    relation: "viewer",
    user: "user:user1",
  }));

  const fgaParams = {
    apiUrl: "https://api.us1.fga.dev",
    storeId: "01GGXW367SRH9YFXJ7GHJN0GMK",
    credentials: {
      method: CredentialsMethod.ClientCredentials,
      config: {
        apiTokenIssuer: "auth.fga.dev",
        apiAudience: "https://api.us1.fga.dev/",
        clientId: "client-id",
        clientSecret: "client-secret",
      },
    },
  };

  const args = {
    ai,
    buildQuery: mockBuildQuery,
  };

  it("should create an instance of RerankerAction with default OpenFgaClient", () => {
    const retriever = FGAReranker.create(args);
    expect(retriever).toBeTypeOf("function");
    expect(retriever.__action.name).toBe("auth0/fga-reranker");
  });

  it("should create an instance of RerankerAction with provided OpenFgaClient params", () => {
    const retriever = FGAReranker.create(args, fgaParams);
    expect(retriever).toBeTypeOf("function");
    expect(retriever.__action.name).toBe("auth0/fga-reranker");
  });

  it("should filter relevant documents based on permission", async () => {
    // @ts-expect-error mock
    const reranker = new FGAReranker(args);
    reranker.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        {
          request: {
            object: "doc:public-doc",
            user: "user:user1",
            relation: "viewer",
          },
          allowed: true,
        },
        {
          request: {
            object: "doc:private-doc",
            user: "user:user1",
            relation: "viewer",
          },
          allowed: false,
        },
      ],
    });

    const rankedDocuments = await reranker.filter(documents);

    expect(rankedDocuments[0].content).toEqual(documents[0].content);
    expect(rankedDocuments[0].metadata.id).toEqual(documents[0].metadata?.id);
  });

  it("should handle empty document list", async () => {
    const rankedDocuments = await ai.rerank({
      reranker: FGAReranker.create(args),
      query: "input",
      documents: [],
    });

    expect(rankedDocuments).toEqual([]);
  });

  it("should handle empty permission list", async () => {
    // @ts-expect-error mock
    const reranker = new FGAReranker(args);
    reranker.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
      result: [],
    });

    const rankedDocuments = await reranker.filter(documents);

    expect(rankedDocuments).toEqual([]);
  });

  it("should deduplicate permission checks for same object/user/relation", async () => {
    const duplicateDocuments = [
      ...documents,
      Document.fromText("private content", { id: "private-doc" }),
      Document.fromText("private content", { id: "public-doc" }),
    ];

    // @ts-expect-error mock
    const reranker = new FGAReranker(args);

    reranker.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        {
          request: {
            object: "doc:public-doc",
            user: "user:user1",
            relation: "viewer",
          },
          allowed: true,
        },
        {
          request: {
            object: "doc:private-doc",
            user: "user:user1",
            relation: "viewer",
          },
          allowed: false,
        },
      ],
    });

    const rankedDocuments = await reranker.filter(duplicateDocuments);

    expect(reranker.fgaFilter.fgaClient.batchCheck).toHaveBeenCalledTimes(1);
    expect(reranker.fgaFilter.fgaClient.batchCheck).toBeCalledWith(
      {
        checks: [
          { object: "doc:public-doc", relation: "viewer", user: "user:user1" },
          { object: "doc:private-doc", relation: "viewer", user: "user:user1" },
        ],
      },
      { consistency: ConsistencyPreference.HigherConsistency }
    );
    expect(rankedDocuments.length).toEqual(2);
    expect(rankedDocuments[0].content).toEqual(documents[0].content);
    expect(rankedDocuments[0].metadata.id).toEqual(documents[0].metadata?.id);
  });

  it("should handle all documents being filtered out", async () => {
    // @ts-expect-error mock
    const reranker = new FGAReranker(args);
    reranker.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        {
          request: {
            object: "doc:private-doc",
            user: "user:user1",
            relation: "viewer",
          },
          allowed: false,
        },
        {
          request: {
            object: "doc:public-doc",
            user: "user:user1",
            relation: "viewer",
          },
          allowed: false,
        },
      ],
    });

    const rankedDocuments = await reranker.filter(documents);

    expect(rankedDocuments).toEqual([]);
  });

  it("should handle batchCheck error gracefully", async () => {
    // @ts-expect-error mock
    const reranker = new FGAReranker(args);
    reranker.fgaFilter.fgaClient.batchCheck = vi
      .fn()
      .mockRejectedValue(new Error("FGA API Error"));

    await expect(reranker.filter(documents)).rejects.toThrow("FGA API Error");
  });

  it("should preserve document metadata in filtered results", async () => {
    const docsWithMetadata = [
      Document.fromText("public content", {
        id: "public-doc",
        importance: "high",
      }),
      Document.fromText("private content", {
        id: "private-doc",
        importance: "high",
      }),
    ];

    // @ts-expect-error mock
    const reranker = new FGAReranker(args);
    reranker.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        {
          request: {
            object: "doc:public-doc",
            user: "user:user1",
            relation: "viewer",
          },
          allowed: true,
        },
        {
          request: {
            object: "doc:private-doc",
            user: "user:user1",
            relation: "viewer",
          },
          allowed: true,
        },
      ],
    });

    const rankedDocuments = await reranker.filter(docsWithMetadata);

    expect(rankedDocuments).toHaveLength(2);
    expect(rankedDocuments[0].metadata).toEqual({
      id: "public-doc",
      importance: "high",
    });
  });
});
