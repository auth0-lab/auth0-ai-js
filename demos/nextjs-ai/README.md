# Chat Application with Auth0 AI and AI SDK

This is a [Next.js](https://nextjs.org) application that implements [Auth0 AI](https://auth0.ai) along with the [AI SDK](https://sdk.vercel.ai/) and to create a chat bot with [OpenAI](https://platform.openai.com) as engine. The application demonstrates how to integrate the AI SDK with Auth0 AI to implement: Authentication & Authorization of apps & APIs with Auth0 and Tool Authorization with FGA.

## Getting Started

### Prerequisites

- An Auth0 account, you can create one [here](https://auth0.com).
- An Okta FGA account, you can create one [here](https://dashboard.fga.dev).
- An OpenAI account and API key create one [here](https://platform.openai.com).

### Prepare the workspace

Copy the `.env.example` file to `.env` and fill in the required values:

```bash
# Auth0
AUTH0_DOMAIN="<auth0-domain>"
AUTH0_CLIENT_ID="<auth0-client-id>"
AUTH0_CLIENT_SECRET="<auth0-client-secret>"

# OpenAI
OPENAI_API_KEY=xx-xxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxx

# Okta FGA
FGA_STORE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxx
FGA_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxx
FGA_CLIENT_SECRET=xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxx

# Required only for non-US regions
FGA_API_URL=https://api.xxx.fga.dev
FGA_API_AUDIENCE=https://api.xxx.fga.dev/
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
