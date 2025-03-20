# Step Up Auth for Tools with LangChain

## Getting Started

### Prerequisites

- An OpenAI account and API key. You can create one [here](https://platform.openai.com).
  - [Use this page for instructions on how to find your OpenAI API key](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)
- An **[Auth0](https://auth0.com)** account and the following settings and resources configured:
  - An application to initiate the authorization flow:
    - **Application Type**: `Web Application`
  - A **Google** social connection enabled for the application.

### Setup the workspace `.env` file

Copy the `.env.example` file to `.env` and fill in the values for the following variables, using the settings obtained from the prerequisites:

```sh
# Auth0
AUTH0_DOMAIN="<auth0-domain>"
AUTH0_CLIENT_ID="<auth0-client-id>"
AUTH0_CLIENT_SECRET="<auth0-client-secret>"

# OpenAI
OPENAI_API_KEY="openai-api-key"
```

### How to run it

1. Install dependencies. If you want to run with local dependencies follow root instructions.

   ```sh
   $ npm install
   ```

2. Start the LangGraph
   ```sh
   npm run dev
   ```

3. Go to [`../../demos/nextjs-ai`](../../../demos/nextjs-ai/) and start the Next.js app.

   ```sh
   npm run dev
   ```

   > [!NOTE]
   > Make sure that the Auth0 credentials are the same in both the LangGraph and the Next.js app.

4. Navigate to `https://localhost:3000/langgraph` and try it out!

### How it works

This Langgraph graph contains two tools:

- `check-country-holiday.ts`: Check if a date is a holiday in a given country.  
  **Example prompt**: "Is 25th April a holiday in the Bolivia?"

- `check-user-calendar.ts`: Check if the logged in user is available on a given date and time.  
  **Example prompt**: "Am I available on April 25th at 9:15 am?"

## License

Apache-2.0
