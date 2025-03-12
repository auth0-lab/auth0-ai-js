# Authorization for tools with LlamaIndex

## Getting Started

### Prerequisites

- An Okta FGA account, you can create one [here](https://dashboard.fga.dev).
  - Set up a new store and execute `npm run fga:init` to initialize it with the necessary model and tuples.
- An OpenAI account and API key create one [here](https://platform.openai.com).

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

2. Running the example

   ```sh
   npm start
   ```

3. Type `buy 10 shares of ATKO`

## License

Apache-2.0
