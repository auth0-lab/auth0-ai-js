## Retrievers with FGA

## Getting Started

### Prerequisites

- An Okta FGA account, you can create one [here](https://dashboard.fga.dev).
  - Set up a new store and execute `npm run fga:init` to initialize it with the necessary model and tuples.
- An OpenAI account and API key create one [here](https://platform.openai.com).

#### `.env` file

```sh
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

### How to run it

1. Install dependencies. If you want to run with local dependencies follow root instructions.

   ```sh
   npm install
   ```

2. Generate the embeddings

   ```sh
   npm run generate
   ```

3. Running the example
   ```sh
   npm start
   ```

## License

Apache-2.0
