# Auth0 AI for Genkit

`@auth0/genkit` is an SDK for building secure AI-powered applications using [Auth0](https://www.auth0.ai/), [Okta FGA](https://docs.fga.dev/) and [Firebase Genkit](https://firebase.google.com/docs/genkit).

## Features

### FGA Reranker

Provides Auth0 FGA as a [reranker](https://firebase.google.com/docs/genkit/rag) for RAG applications. The reranker allows filtering documents based on access control checks defined in Okta FGA. This reranker performs batch checks on retrieved documents, returning only the ones that pass the specified access criteria.

### FGA Authorizer

Provides Auth0 FGA as a tool authorizer that protects the tool execution with FGA.

## Install

> [!WARNING]
> `@auth0/ai-genkit` is currently under development and it is not intended to be used in production, and therefore has no official support.

```
$ npm install @auth0/ai-genkit
```

## Usage

Example [RAG Application](../../examples/authorization-for-rag/genkit).

Create a Reranker instance using the `FGAReranker.create` method.

```ts
// initialize a GenKit instance
const ai = genkit({ plugins: [ auth0(), ...] });
// UserID
const user = "user1";

// 1. Create an FGAReranker instance to check the permissions of the user.
const fgaReranker = FGAReranker.create({
  ai,
  // FGA tuple to query for the user's permissions
  buildQuery: (doc) => ({
    user: `user:${user}`,
    object: `doc:${doc.metadata?.id}`,
    relation: "viewer",
  }),
});

// 2. Define a flow that retrieves and reranks documents.
const demoFlow = ai.defineFlow(
  { name: "demo", inputSchema: z.string(), outputSchema: z.string() },
  async (query: string) => {
    // 3. Retrieve documents from the in-memory vector store
    const documents = await ai.retrieve({
      retriever: devLocalRetrieverRef("documents"),
      query,
    });
    // 4. Rerank the documents based on the user's permissions
    const rerankedDocuments = await ai.rerank({
      reranker: fgaReranker,
      query,
      documents,
    });
    // 5. Execute the query with the reranked documents as context
    const { text } = await ai.generate({
      model: gpt4oMini,
      system:
        "Use only the context provided to answer the question. If you don't know, do not make up an answer.",
      prompt: query,
      docs: documents,
    });

    return text;
  }
);

/**
 * Output: `The provided context does not include any forecast...`
 */
console.log(await demoFlow("Show me forecast for ZEKO?"));
```

## Feedback

### Contributing

We appreciate feedback and contribution to this repo! Before you get started, please see the following:

- [Auth0's general contribution guidelines](https://github.com/auth0/open-source-template/blob/master/GENERAL-CONTRIBUTING.md)
- [Auth0's code of conduct guidelines](https://github.com/auth0/open-source-template/blob/master/CODE-OF-CONDUCT.md)

### Raise an issue

To provide feedback or report a bug, please [raise an issue on our issue tracker](https://github.com/auth0-lab/auth0-ai-js/issues).

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
