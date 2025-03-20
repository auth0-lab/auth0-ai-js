/* eslint-disable @typescript-eslint/ban-ts-comment */
import { describe, expect, it, vi } from "vitest";

import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import { ConsistencyPreference, CredentialsMethod } from "@openfga/sdk";

import { FGARetriever } from "../src/RAG";

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

  it("should create an instance of FGARetriever with provided OpenFgaClient params", () => {
    const retriever = FGARetriever.create(args, fgaParams);
    expect(retriever).toBeInstanceOf(FGARetriever);
  });

  it("should filter documents based on permissions", async () => {
    const retriever = FGARetriever.create(args);
    // @ts-expect-error
    mockRetriever._getRelevantDocuments.mockResolvedValue(mockDocuments);
    // @ts-expect-error
    retriever.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
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

    const result = await retriever.invoke("query");
    expect(result).toEqual([mockDocuments[0]]);
  });

  it("should handle empty document list", async () => {
    const retriever = FGARetriever.create(args);
    // @ts-expect-error
    mockRetriever._getRelevantDocuments.mockResolvedValue([]);

    const result = await retriever.invoke("test query");
    expect(result).toHaveLength(0);
  });

  it("should handle empty permission list", async () => {
    const retriever = FGARetriever.create(args);
    // @ts-expect-error
    mockRetriever._getRelevantDocuments.mockResolvedValue(mockDocuments);
    // @ts-expect-error
    retriever.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
      result: [],
    });

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

    const retriever = FGARetriever.create(args);
    // @ts-expect-error
    mockRetriever._getRelevantDocuments.mockResolvedValue(duplicateDocuments);
    // @ts-expect-error
    retriever.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
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

    const result = await retriever.invoke("test query");
    expect(result).toHaveLength(2);
    // @ts-expect-error
    expect(retriever.fgaFilter.fgaClient.batchCheck).toHaveBeenCalledTimes(1);
    // @ts-expect-error
    expect(retriever.fgaFilter.fgaClient.batchCheck).toBeCalledWith(
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
    const retriever = FGARetriever.create(args);
    // @ts-expect-error
    mockRetriever._getRelevantDocuments.mockResolvedValue(mockDocuments);
    // @ts-expect-error
    retriever.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        { request: { object: "doc:public-doc" }, allowed: false },
        { request: { object: "doc:private-doc" }, allowed: false },
      ],
    });

    const result = await retriever.invoke("test query");
    expect(result).toHaveLength(0);
  });

  it("should return joined string of filtered doc content", async () => {
    const retriever = FGARetriever.create(args);
    // @ts-expect-error
    mockRetriever._getRelevantDocuments.mockResolvedValue(mockDocuments);
    // @ts-expect-error
    retriever.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
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

    const tool = retriever.asJoinedStringTool();
    const result = await tool.invoke({ query: "test query" });
    expect(result).toEqual("public content\n\nprivate content");
  });

  it("should handle batchCheck error gracefully", async () => {
    const retriever = FGARetriever.create(args);
    // @ts-expect-error
    retriever.fgaFilter.fgaClient.batchCheck = vi
      .fn()
      .mockRejectedValue(new Error("FGA API Error"));

    await expect(retriever.invoke("test query")).rejects.toThrow(
      "FGA API Error"
    );
  });
});
