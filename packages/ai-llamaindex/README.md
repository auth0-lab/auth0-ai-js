# Auth0 AI for LlamaIndex

This package integrates [LlamaIndex](https://ts.llamaindex.ai/) with [Auth0 AI](https://www.auth0.ai/) for enhanced document retrieval capabilities.

`@auth0/ai-llamaindex` is an SDK for building secure AI-powered applications using [Auth0](https://www.auth0.ai/), [Okta FGA](https://docs.fga.dev/) and [LlamaIndex](https://ts.llamaindex.ai/).

## Features

### FGA Retriever

Provides Okta FGA as a [retriever](https://docs.llamaindex.ai/en/stable/module_guides/querying/retriever/) for RAG applications. The retriever allows filtering documents based on access control checks defined in Okta FGA. This retriever performs batch checks on retrieved documents, returning only the ones that pass the specified access criteria.

### FGA Authorizer

Provides Okta FGA as a tool authorizer that protects the tool execution with FGA.

### Async Authorizer

Provides Async User Authorizer using [Client Initiated Backchannel Authentication (CIBA)](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html).

## Install

> [!WARNING]
> `@auth0/ai-llamaindex` is currently under development and it is not intended to be used in production, and therefore has no official support.

```
$ npm install @auth0/ai-llamaindex
```

## Usage

Example [RAG Application](../../examples/authorization-for-rag/llamaindex).

Create a Retriever instance using the `FGAReranker.create` method.

```typescript
import { FGARetriever } from "@auth0/ai-llamaindex";
import { VectorStoreIndex } from "llamaindex";
import { readDocuments } from "./helpers";

async function main() {
  // UserID
  const user = "user1";
  const documents = await readDocuments();
  // 1. Create `VectorStoreIndex` from documents.
  const vectorStoreIndex = await VectorStoreIndex.fromDocuments(documents);
  // 2. Initialize query engine.
  const queryEngine = vectorStoreIndex.asQueryEngine({
    // 3. Decorate the retriever with the FGARetriever to check permissions.
    retriever: FGARetriever.create({
      retriever: vectorStoreIndex.asRetriever(),
      buildQuery: (document) => ({
        user: `user:${user}`,
        object: `doc:${document.metadata.id}`,
        relation: "viewer",
      }),
    }),
  });

  // 4. Execute the query
  const vsiResponse = await queryEngine.query({
    query: "Show me forecast for ZEKO?",
  });

  console.log(vsiResponse.toString());
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

