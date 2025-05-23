/* eslint-disable @typescript-eslint/ban-ts-comment */
import { BaseRetriever, NodeWithScore } from "llamaindex";
import { describe, expect, it, vi } from "vitest";

import { ConsistencyPreference, CredentialsMethod } from "@openfga/sdk";

import { FGARetriever, FGARetrieverCheckerFn } from "../src/FGA/fga-retriever";

describe("FGARetriever", () => {
  process.env.FGA_CLIENT_ID = "client-id";
  process.env.FGA_CLIENT_SECRET = "client-secret";

  const mockDocuments = [
    {
      node: { text: "public content", metadata: { id: "public-doc" } },
      score: 1,
    } as unknown as NodeWithScore,
    {
      node: { text: "private content", metadata: { id: "private-doc" } },
      score: 1,
    } as unknown as NodeWithScore,
  ];

  const mockRetriever = {
    retrieve: vi.fn().mockResolvedValue(mockDocuments),
  } as unknown as BaseRetriever;

  const mockBuildQuery = vi.fn((doc) => ({
    object: `doc:${doc.node.metadata.id}`,
    relation: "viewer",
    user: "user:user1",
  })) as unknown as FGARetrieverCheckerFn;

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

  it("retrieves and filters nodes based on permissions", async () => {
    const retriever = FGARetriever.create(args);
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

    const result = await retriever.retrieve({ query: "test" });
    expect(result).toEqual([mockDocuments[0]]);
  });

  it("should handle empty document list", async () => {
    // @ts-expect-error
    args.retriever.retrieve.mockResolvedValue([]);
    const retriever = FGARetriever.create(args);

    const result = await retriever.retrieve({ query: "test" });
    expect(result).toHaveLength(0);
  });

  it("should handle empty permission list", async () => {
    const retriever = FGARetriever.create(args);
    // @ts-expect-error
    retriever.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
      result: [],
    });

    const result = await retriever.retrieve({ query: "test" });
    expect(result).toHaveLength(0);
  });

  it("should deduplicate permission checks for same object/user/relation", async () => {
    const duplicateDocuments = [
      ...mockDocuments,
      {
        node: { text: "public content", metadata: { id: "public-doc" } },
        score: 1,
      } as unknown as NodeWithScore,
      {
        node: { text: "private content", metadata: { id: "private-doc" } },
        score: 1,
      } as unknown as NodeWithScore,
    ];

    // @ts-expect-error
    args.retriever.retrieve.mockResolvedValue(duplicateDocuments);

    const retriever = FGARetriever.create(args);
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

    const result = await retriever.retrieve({ query: "test" });
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
    retriever.fgaFilter.fgaClient.batchCheck = vi.fn().mockResolvedValue({
      result: [
        { request: { object: "doc:public-doc" }, allowed: false },
        { request: { object: "doc:private-doc" }, allowed: false },
      ],
    });

    const result = await retriever.retrieve({ query: "test" });
    expect(result).toHaveLength(0);
  });

  it("should handle batchCheck error gracefully", async () => {
    const retriever = FGARetriever.create(args);
    // @ts-expect-error
    retriever.fgaFilter.fgaClient.batchCheck = vi
      .fn()
      .mockRejectedValue(new Error("FGA API Error"));

    await expect(retriever.retrieve({ query: "test" })).rejects.toThrow(
      "FGA API Error"
    );
  });
});
