import { describe, it, expect, vi } from "vitest";
import { FGARetriever } from "../src/retrievers/fga-retriever";
import {
  OpenFgaClient,
  CredentialsMethod,
  ConsistencyPreference,
} from "@openfga/sdk";
import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";

describe("FGARetriever", () => {
  process.env.FGA_CLIENT_ID = "client-id";
  process.env.FGA_CLIENT_SECRET = "client-secret";

  const mockRetriever = {
    _getRelevantDocuments: vi.fn(),
  } as unknown as BaseRetriever;

  const mockBuildQuery = vi.fn((doc: Document) => ({
    object: `doc:${doc.metadata.id}`,
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

  const mockDocuments = [
    new Document({
      metadata: { id: "public-doc" },
      pageContent: "public content",
    }),
    new Document({
      metadata: { id: "private-doc" },
      pageContent: "private content",
    }),
  ];

  const args = {
    retriever: mockRetriever,
    buildQuery: mockBuildQuery,
  };

  it("should create an instance of FGARetriever with default OpenFgaClient", () => {
    const retriever = FGARetriever.create(args);
    expect(retriever).toBeInstanceOf(FGARetriever);
  });

  it("should create an instance of FGARetriever with provided OpenFgaClient", () => {
    const retriever = FGARetriever.create(args, mockClient);
    expect(retriever).toBeInstanceOf(FGARetriever);
  });

  it("should filter documents based on permissions", async () => {
    const retriever = FGARetriever.create(args, mockClient);
    // @ts-ignore
    mockRetriever._getRelevantDocuments.mockResolvedValue(mockDocuments);
    // @ts-ignore
    mockClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        { request: { object: "doc:public-doc" }, allowed: true },
        { request: { object: "doc:private-doc" }, allowed: false },
      ],
    });

    const result = await retriever.invoke("query");
    expect(result).toEqual([mockDocuments[0]]);
  });

  it("should handle empty document list", async () => {
    const retriever = FGARetriever.create(args, mockClient);
    // @ts-ignore
    mockRetriever._getRelevantDocuments.mockResolvedValue([]);

    const result = await retriever.invoke("test query");
    expect(result).toHaveLength(0);
  });

  it("should handle empty permission list", async () => {
    const retriever = FGARetriever.create(args, mockClient);
    // @ts-ignore
    mockRetriever._getRelevantDocuments.mockResolvedValue(mockDocuments);
    // @ts-ignore
    mockClient.batchCheck = vi.fn().mockResolvedValue({ result: [] });

    const result = await retriever.invoke("test query");
    expect(result).toHaveLength(0);
  });

  it("should deduplicate permission checks for same object/user/relation", async () => {
    const duplicateDocuments = [
      ...mockDocuments,
      new Document({
        metadata: { id: "public-doc" },
        pageContent: "public content",
      }),
      new Document({
        metadata: { id: "private-doc" },
        pageContent: "private content",
      }),
    ];

    const retriever = FGARetriever.create(args, mockClient);
    // @ts-ignore
    mockRetriever._getRelevantDocuments.mockResolvedValue(duplicateDocuments);
    // @ts-ignore
    mockClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        { request: { object: "doc:public-doc" }, allowed: true },
        { request: { object: "doc:private-doc" }, allowed: false },
      ],
    });

    const result = await retriever.invoke("test query");
    expect(result).toHaveLength(2);
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
  });

  it("should handle all documents being filtered out", async () => {
    const retriever = FGARetriever.create(args, mockClient);
    // @ts-ignore
    mockRetriever._getRelevantDocuments.mockResolvedValue(mockDocuments);
    // @ts-ignore
    mockClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        { request: { object: "doc:public-doc" }, allowed: false },
        { request: { object: "doc:private-doc" }, allowed: false },
      ],
    });

    const result = await retriever.invoke("test query");
    expect(result).toHaveLength(0);
  });

  it("should return joined string of filtered doc content", async () => {
    const retriever = FGARetriever.create(args, mockClient);
    // @ts-ignore
    mockRetriever._getRelevantDocuments.mockResolvedValue(mockDocuments);
    // @ts-ignore
    mockClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        { request: { object: "doc:public-doc" }, allowed: true },
        { request: { object: "doc:private-doc" }, allowed: true },
      ],
    });

    const tool = retriever.asJoinedStringTool();
    const result = await tool.invoke({ query: "test query" });
    expect(result).toEqual("public content\n\nprivate content");
  });

  it("should handle batchCheck error gracefully", async () => {
    // @ts-ignore
    mockClient.batchCheck = vi
      .fn()
      .mockRejectedValue(new Error("FGA API Error"));

    const retriever = FGARetriever.create(args, mockClient);
    await expect(retriever.invoke("test query")).rejects.toThrow(
      "FGA API Error"
    );
  });
});
