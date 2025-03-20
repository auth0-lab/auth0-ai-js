# Authorization for tools with LlamaIndex

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

3. Running the example
   ```sh
   npm start
   ```

4. Try to buy `ATKO` or `ZEKO` stocks!


## License

Apache-2.0
