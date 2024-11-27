# Auth0 AI for JavaScript

> [!WARNING]
> Auth0 AI is currently under development and it is not intended to be used in production, and therefore has no official support.

[Auth0 AI](https://www.auth0.ai/) helps you build secure AI-powered
applications.

Developers are using LLMs to build generative AI applications that deliver
powerful new experiences for customers and employees. Maintaining security and
privacy while allowing AI agents to assist people in their work and lives is a
critical need. Auth0 AI helps you meet these requirements, ensuring that agents
are properly authorized when taking actions or accessing resources on behalf of
a person or organization. Common use cases include:

- **Authenticate users**: Easily implement login experiences, tailor made for
  AI agents and assistants.
- **Call APIs on users' behalf**: Use secure standards to call APIs from tools,
  integrating your app with other products.
- **Authorization for RAG**: Generate more relevant responses while ensuring
  that the agent is only incorporating information that the user has access to.
- **Async user confirmation**: Allow agents to operate autonomously in the
  background while requiring human approval when needed.

## Packages

- [`@auth0/ai`](https://github.com/auth0-lab/auth0-ai-js/tree/main/packages/ai) -
  Base abstractions for authentication and authorization in AI applications.

- [`@auth0/ai-genkit`](https://github.com/auth0-lab/auth0-ai-js/tree/main/packages/ai-genkit) -
  Integration with [Genkit](https://firebase.google.com/docs/genkit) framework.

- [`@auth0/ai-llamaindex`](https://github.com/auth0-lab/auth0-ai-js/tree/main/packages/ai-llamaindex) -
  Integration with [LlamaIndex.TS](https://ts.llamaindex.ai/) framework.

- [`@auth0/ai-langchain`](https://github.com/auth0-lab/auth0-ai-js/tree/main/packages/ai-langchain) -
  Integration with [LangchainJS](https://js.langchain.com/docs/introduction/) framework.

## Running examples

1. Install depedencies for the workspace

   ```sh
   $ npm install
   ```

2. Run [Turbo](https://turbo.build/)

   ```sh
   $ npm run build
   ```

3. Follow example instructions

## License

Apache-2.0
