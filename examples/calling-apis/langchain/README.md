# Step Up Auth for Tools with LangChain

## Getting Started

#### `.env` file

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

3. Go to `../../demos/nextjs-ai` and start the Next.js app.

   ```sh
   npm run dev
   ```

4. Navigate to `https://localhost:3000/langgraph`.

### How this works

This graph contains two tools:

- `check-country-holiday.ts` Check if a date is a holiday in a given country.
    Example prompt: "Is 25th April a holiday in the Bolivia?"
-  `check-user-calendar.ts` Check if the logged in user is available on a given date and time.
    Example prompt: "Am I available on April 25th at 9:15 am?"

## License

Apache-2.0
