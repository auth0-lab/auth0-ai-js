# Chat Application with Auth0 AI and AI SDK

This is a [Next.js](https://nextjs.org) application that implements [Auth0 AI](https://auth0.ai) along with the [AI SDK](https://sdk.vercel.ai/) and to create a chat bot with [OpenAI](https://platform.openai.com) as engine. The application demonstrates how to integrate the AI SDK with Auth0 AI to implement: Authentication & Authorization of apps & APIs with Auth0.

## Getting Started

### Prerequisites

- An OpenAI account and API key. You can create one [here](https://platform.openai.com).
  - [Use this page for instructions on how to find your OpenAI API key](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)
- An **[Auth0](https://auth0.com)** account and the following settings and resources configured:
  - An application to initiate the authorization flow:
    - **Application Type**: `Regular Web Application`
    - **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
    - **Allowed Logout URLs**: `http://localhost:3000`
    - **Grant Type**: `Token Exchange (Federated Connection)` (or `urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token`). You should also ensure that the `Refresh Token` grant type is enabled for flows which do not use an external API.
    - **Allow Refresh Token Rotation**: currently you should disable this setting if you are using Token Vault for token exchanges with a refresh token.
  - An API for representing the external Langgraph API Server
    - In your Auth0 Dashboard, go to Applications > APIs
    - Create a new API with an identifier (audience).
    - Ensure that "Allow Offline Access" is enabled for your API if you are using a flow which still makes use of refresh tokens.
  - A Resource Server Client for performing token exchanges with Token Vault on behalf of a user. This will be used by the Langgraph API server (@langchain/langgraph-cli or Langgraph Platform) when executing tools that require third-party access. 
    - Create the Resource Server Client using the Management API:
      ```
          curl -L 'https://{tenant}.auth0.com/api/v2/clients' \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json' \
      -H 'Authorization: Bearer {MANAGEMENT_API_TOKEN}' \
      -d '{
        "name": "Calendar API Resource Server Client",
        "app_type": "resource_server",
        "grant_types": ["urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token"],
        "resource_server_identifier": "YOUR_API_IDENTIFIER"
      }'
      ```
      - Your `MANAGEMENT_API_TOKEN` above must have the `create:clients` scope in order to create a new client. To create a new Management API token with the right access permissions:
        - Navigate to Applications > APIs > Auth0 Management API > API Explorer tab in your tenant.
        - Click the Create & Authorize Test Application button.
        - Copy the JWT access token shown and provide it as the `MANAGEMENT_API_TOKEN`.
        - Use the audience that you provided when creating the API for the Langgraph API Server as the `resource_server_identifier`.
      - Note down the `client_id` and `client_secret` returned from the cURL response for your environment variables after running cURL successfully.
  - Either **Google**, **Slack** or **Github** social connections enabled for the application.

### Setup the workspace `.env` file

Copy the `.env.example` file to `.env` and fill in the values for the following variables, using the settings obtained from the prerequisites:

```bash
# Auth0
AUTH0_DOMAIN="<auth0-domain>"
AUTH0_CLIENT_ID="<auth0-client-id>"
AUTH0_CLIENT_SECRET="<auth0-client-secret>"
AUTH0_SECRET="<use [openssl rand -hex 32] to generate a 32 bytes value>"
APP_BASE_URL=http://localhost:3000
# the offline_access scope is needed if your flow is using a refresh token
AUTH0_SCOPE='openid profile email offline_access'
# Langgraph API audience
AUTH0_AUDIENCE="<auth0-audience>"
NEXT_PUBLIC_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY=xx-xxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxx

# LANGGRAPH
LANGGRAPH_API_URL=http://localhost:54367
# Auth0 Resource Server Client Configuration (for token exchange with Token Vault)
# These credentials belong to a special "resource_server" client that can perform token exchanges
# on behalf of the user within your Langgraph API
RESOURCE_SERVER_CLIENT_ID="<your-resource-server-client-id>"
RESOURCE_SERVER_CLIENT_SECRET="<your-resource-server-client-secret>"
```

> [!NOTE]
> Auth0 config is necessary to run the authentication & authorization flows. Make sure to utilize a [Web Application type of client](https://auth0.com/docs/get-started/auth0-overview/create-applications/regular-web-apps).

### Install & run

Install the dependencies running the following command:

```bash
npm install
```

Then, run the Next.js development server like:

```bash
npm run dev
```

This will start the development server at [http://localhost:3000](http://localhost:3000). You can open the URL with your browser to try the application.

> [!NOTE]
> For the [Langgraph example](/examples/calling-apis/chatbot/app/(langgraph)/) to work, it's necessary to run a local Langgraph server with the following command:
> ```bash
> npm run langgraph:dev
> ```
> Alternatively, you can always use a remote one and update the `LANGGRAPH_API_URL` from the `.env` file here.

## Learn More

To learn more about the Auth0 AI and the other AI SDKs utilized on these examples:

- [Auth0 AI](https://auth0.ai)
- [AI SDK](https://sdk.vercel.ai/)
- [Genkit](https://firebase.google.com/docs/genkit)
- [LlamaIndex](https://ts.llamaindex.ai/)
- [LangGraph](https://langchain-ai.github.io/langgraph/)
- [Next.js](https://nextjs.org)
- [Next.js-Auth0](https://github.com/auth0/nextjs-auth0)

## License

Apache-2.0
