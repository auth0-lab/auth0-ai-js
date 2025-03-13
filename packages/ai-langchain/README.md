# Auth0 AI for LangChain

`@auth0/ai-langchain` is an SDK for building secure AI-powered applications using [Auth0](https://www.auth0.ai/), [Okta FGA](https://docs.fga.dev/) and [LangChain](https://js.langchain.com/docs/tutorials/).

This SDK provides Okta FGA as a [retriever](https://js.langchain.com/docs/concepts/retrievers/) for RAG applications. The retriever allows filtering documents based on access control checks defined in Okta FGA. This retriever performs batch checks on retrieved documents, returning only the ones that pass the specified access criteria.

## Install

> [!WARNING]
> `@auth0/ai-langchain` is currently under development and it is not intended to be used in production, and therefore has no official support.

```
$ npm install @auth0/ai-langchain
```

## Authorization for Tools

Example [Authorization for tools](../../examples/authorization-for-tools/langchain/).

1. Create an instance of Auth0 AI:

```ts
import { Auth0AI } from "@auth0/ai-langchain";

const auth0AI = new Auth0AI.FGA();
```

**Note**: Here, you can configure and specify your FGA credentials. By `default`, they are read from environment variables:

```sh
FGA_STORE_ID="<fga-store-id>"
FGA_CLIENT_ID="<fga-client-id>"
FGA_CLIENT_SECRET="<fga-client-secret>"
```

2. Define the FGA query:

```ts
const useFGA = auth0AI.withFGA({
  buildQuery: async (params, ctx) => {
    return {
      user: `user:${ctx.configurable?.user_id}`,
      object: `asset:${params.ticker}`,
      relation: "can_buy",
      context: { current_time: new Date().toISOString() },
    };
  },
  onUnauthorized(params) {
    console.log("onUnauthorized", params);
    return `The user is not allowed to buy ${params.ticker}.`;
  },
});
```

**Note**: The parameters given to the `buildQuery` function are the same as those provided to the tool function.

3. Putting it all together

```ts
import { z } from "zod";

import { Auth0AI } from "@auth0/ai-langchain";
import { tool } from "@langchain/core/tools";

// 1. Auth0 AI Instance
const auth0AI = new Auth0AI.FGA();

// 2. Defining FGA query
const useFGA = auth0AI.withFGA({
  buildQuery: async (params, ctx) => {
    return {
      user: `user:${ctx.configurable?.user_id}`,
      object: `asset:${params.ticker}`,
      relation: "can_buy",
      context: { current_time: new Date().toISOString() },
    };
  },
  onUnauthorized(params) {
    console.log("onUnauthorized", params);
    return `The user is not allowed to buy ${params.ticker}.`;
  },
});

// 3. Tool definition
export const buyTool = tool(
  useFGA(async ({ ticker, qty }) => {
    return `Purchased ${qty} shares of ${ticker}`;
  }),
  {
    name: "buy",
    description: "Use this function to buy stock",
    schema: z.object({
      ticker: z.string(),
      qty: z.number(),
    }),
  }
);
```

## RAG with FGA

Example [RAG Application](../../examples/authorization-for-rag/langchain/).

Create a Retriever instance using the `FGARetriever.create` method.

```typescript
// From examples/langchain/retrievers-with-fga
import { FGARetriever } from "@auth0/ai-langchain";
import { MemoryStore, RetrievalChain } from "./helpers/memory-store";
import { readDocuments } from "./helpers/read-documents";

async function main() {
  // UserID
  const user = "user1";
  const documents = await readDocuments();
  // 1. Call helper function to load LangChain MemoryStore
  const vectorStore = await MemoryStore.fromDocuments(documents);
  // 2. Call helper function to create a LangChain retrieval chain.
  const retrievalChain = await RetrievalChain.create({
    // 3. Decorate the retriever with the FGARetriever to check permissions.
    retriever: FGARetriever.create({
      retriever: vectorStore.asRetriever(),
      buildQuery: (doc) => ({
        user: `user:${user}`,
        object: `doc:${doc.metadata.id}`,
        relation: "viewer",
      }),
    }),
  });

  // 4. Execute the query
  const { answer } = await retrievalChain.query({
    query: "Show me forecast for ZEKO?",
  });

  console.log(answer);
}

main().catch(console.error);
```

## Feedback

### Contributing

We appreciate feedback and contribution to this repo! Before you get started, please see the following:

- [Auth0's general contribution guidelines](https://github.com/auth0/open-source-template/blob/master/GENERAL-CONTRIBUTING.md)
- [Auth0's code of conduct guidelines](https://github.com/auth0/open-source-template/blob/master/CODE-OF-CONDUCT.md)

### Raise an issue

To provide feedback or report a bug, please [raise an issue on our issue tracker](https://github.com/auth0-lab/auth0-ai-python/issues).

### Vulnerability Reporting

Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/responsible-disclosure-policy) details the procedure for disclosing security issues.

---

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://cdn.auth0.com/website/sdks/logos/auth0_light_mode.png"   width="150">
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.auth0.com/website/sdks/logos/auth0_dark_mode.png" width="150">
    <img alt="Auth0 Logo" src="https://cdn.auth0.com/website/sdks/logos/auth0_light_mode.png" width="150">
  </picture>
</p>
<p align="center">Auth0 is an easy to implement, adaptable authentication and authorization platform. To learn more checkout <a href="https://auth0.com/why-auth0">Why Auth0?</a></p>
<p align="center">
This project is licensed under the Apache 2.0 license. See the <a href="/LICENSE"> LICENSE</a> file for more info.</p>
