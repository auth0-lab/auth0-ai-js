# Authorization for tools with LangChain

## Getting Started

### Prerequisites

- An OpenAI account and API key. You can create one [here](https://platform.openai.com).
  - [Use this page for instructions on how to find your OpenAI API key](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)
- An Okta FGA account, you can create one [here](https://dashboard.fga.dev).
  - Set up a new store and execute `npm run fga:init` to initialize it with the necessary model and tuples.

#### `.env` file

```sh
# OpenAI
OPENAI_API_KEY="<openai-api-key>"

# Okta FGA
FGA_STORE_ID="<fga-store-id>"
FGA_CLIENT_ID="<fga-client-id>"
FGA_CLIENT_SECRET="<fga-client-secret>"

# Langchain
LANGGRAPH_API_URL="http://localhost:54367"
```

### How to run it

1. Install dependencies. If you want to run with local dependencies follow root instructions.

   ```sh
   npm install
   ```

2. Initialize the FGA store's model
   ```sh
   npm run fga:init
   ```

3. Running Langraph

   ```sh
   npm run start
   ```

4. LangGraph Studio: Configuring the assitant
   1.  Click on `Manage Assistants`

        ![](https://cdn.auth0.com/website/auth0-lab/ai/sdks/01-langchain-auth-tools.png)

   3. Create a new assistant

      > Use the following data:

      ```json
      {
        "user_id": "john"
      }
      ```

      ![](https://cdn.auth0.com/website/auth0-lab/ai/sdks/02-langchain-auth-tools.png)

   3. Run it!

      ![](https://cdn.auth0.com/website/auth0-lab/ai/sdks/03-langchain-auth-tools.png)

## License

Apache-2.0
