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
  - A **Google** social connection enabled for the application.

### Setup the workspace `.env` file

Copy the `.env.example` file to `.env` and fill in the values for the following variables, using the settings obtained from the prerequisites:

```bash
# Auth0
AUTH0_DOMAIN="<auth0-domain>"
AUTH0_CLIENT_ID="<auth0-client-id>"
AUTH0_CLIENT_SECRET="<auth0-client-secret>"

# OpenAI
OPENAI_API_KEY=xx-xxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxx
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

## Learn More

To learn more about the Auth0 AI and the AI SDK, take a look at the following resources:

- [Auth0 AI](https://auth0.ai)
- [AI SDK](https://sdk.vercel.ai/)
- [Next.js](https://nextjs.org)

## License

Apache-2.0
