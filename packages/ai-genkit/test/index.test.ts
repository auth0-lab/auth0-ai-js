import { describe, it, expect, vi } from "vitest";
import { genkit, Document } from "genkit";
import { FGAReranker, auth0 } from "../src/retrievers/fga-reranker";

import {
  OpenFgaClient,
  CredentialsMethod,
  ConsistencyPreference,
} from "@openfga/sdk";

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

  const mockClient = new OpenFgaClient({
    apiUrl: "https://api.us1.fga.dev",
    storeId: "01GGXW367SRH9YFXJ7GHJN0GMK",
    credentials: {
      method: CredentialsMethod.ClientCredentials,
      config: {
        apiTokenIssuer: "fga.us.auth0.com",
        apiAudience: "https://api.us1.fga.dev/",
        clientId: "client-id",
        clientSecret: "client-secret",
      },
    },
  });

  const args = {
    ai,
    buildQuery: mockBuildQuery,
  };

  it("should create an instance of RerankerAction with default OpenFgaClient", () => {
    const retriever = FGAReranker.create(args);
    expect(retriever).toBeTypeOf("function");
    expect(retriever.__action.name).toBe("auth0/fga-reranker");
  });

  it("should create an instance of RerankerAction with provided OpenFgaClient", () => {
    const retriever = FGAReranker.create(args, mockClient);
    expect(retriever).toBeTypeOf("function");
    expect(retriever.__action.name).toBe("auth0/fga-reranker");
  });

  it("should filter relevant documents based on permission", async () => {
    // @ts-ignore
    mockClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        { request: { object: "doc:public-doc" }, allowed: true },
        { request: { object: "doc:private-doc" }, allowed: false },
      ],
    });

    const rankedDocuments = await ai.rerank({
      reranker: FGAReranker.create(args, mockClient),
      query: "input",
      documents,
    });

    expect(rankedDocuments[0].content).toEqual(documents[0].content);
    expect(rankedDocuments[0].metadata.id).toEqual(documents[0].metadata?.id);
  });

  it("should handle empty document list", async () => {
    const rankedDocuments = await ai.rerank({
      reranker: FGAReranker.create(args, mockClient),
      query: "input",
      documents: [],
    });

    expect(rankedDocuments).toEqual([]);
  });

  it("should handle empty permission list", async () => {
    // @ts-ignore
    mockClient.batchCheck = vi.fn().mockResolvedValue({ result: [] });

    const rankedDocuments = await ai.rerank({
      reranker: FGAReranker.create(args, mockClient),
      query: "input",
      documents,
    });

    expect(rankedDocuments).toEqual([]);
  });

  it("should deduplicate permission checks for same object/user/relation", async () => {
    const duplicateDocuments = [
      ...documents,
      Document.fromText("private content", { id: "private-doc" }),
      Document.fromText("private content", { id: "public-doc" }),
    ];

    // @ts-ignore
    mockClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        { request: { object: "doc:public-doc" }, allowed: true },
        { request: { object: "doc:private-doc" }, allowed: false },
      ],
    });

    const rankedDocuments = await ai.rerank({
      reranker: FGAReranker.create(args, mockClient),
      query: "input",
      documents: duplicateDocuments,
    });

    expect(mockClient.batchCheck).toHaveBeenCalledTimes(1);
    expect(mockClient.batchCheck).toBeCalledWith(
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
    // @ts-ignore
    mockClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        { request: { object: "doc:private-doc" }, allowed: false },
        { request: { object: "doc:public-doc" }, allowed: false },
      ],
    });

    const rankedDocuments = await ai.rerank({
      reranker: FGAReranker.create(args, mockClient),
      query: "input",
      documents,
    });

    expect(rankedDocuments).toEqual([]);
  });

  it("should handle batchCheck error gracefully", async () => {
    // @ts-ignore
    mockClient.batchCheck = vi
      .fn()
      .mockRejectedValue(new Error("FGA API Error"));

    await expect(
      ai.rerank({
        reranker: FGAReranker.create(args, mockClient),
        query: "input",
        documents,
      })
    ).rejects.toThrow("FGA API Error");
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

    // @ts-ignore
    mockClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        { request: { object: "doc:public-doc" }, allowed: true },
        { request: { object: "doc:private-doc" }, allowed: true },
      ],
    });

    const rankedDocuments = await ai.rerank({
      reranker: FGAReranker.create(args, mockClient),
      query: "input",
      documents: docsWithMetadata,
    });

    expect(rankedDocuments).toHaveLength(2);
    expect(rankedDocuments[0].metadata).toEqual({
      id: "public-doc",
      importance: "high",
      score: 1,
    });
  });
});
