# LlamaIndex Retrievers + Okta FGA

This example demonstrates how to combine [LlamaIndex](https://ts.llamaindex.ai/) with robust authorization controls for RAG workflows. Using [Okta FGA](https://docs.fga.dev/), it ensures that users can only access documents they are authorized to view. The example retrieves relevant documents, enforces access permissions, and generates responses based only on authorized data, maintaining strict data security and preventing unauthorized access.

## Getting Started

### Prerequisites

- An OpenAI account and API key. You can create one [here](https://platform.openai.com).
  - [Use this page for instructions on how to find your OpenAI API key](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)
- An Okta FGA account, you can create one [here](https://dashboard.fga.dev).
  - Set up a new Authorized Client from the `Settings` page and then follow the steps to setup the workspace below.

### Setup the workspace `.env` file

Copy the `.env.example` file to `.env` and fill in the values for the following variables, using the settings obtained from the prerequisites:

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

2. Initialize the FGA store's model
   ```sh
   npm run fga:init
   ```

3. Running the example
   ```sh
   npm start
   ```

## License

Apache-2.0
