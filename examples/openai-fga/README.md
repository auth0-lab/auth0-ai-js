## OpenAI + RAG + Okta FGA

## Getting Started

### Prerequisites

- An Okta FGA account, you can create one [here](https://dashboard.fga.dev).
- An OpenAI account and API key create one [here](https://platform.openai.com).

### Setup

1. Create a `.env` file using the format below:

   ```sh
   # OpenAI
   OPENAI_API_KEY=

   # Okta FGA
   FGA_STORE_ID=
   FGA_CLIENT_ID=
   FGA_CLIENT_SECRET=
   ```

#### Obtain OpenAI API Key

[Use this page for instructions on how to find your OpenAI API key](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key). Once you have your key, update the `.env` file accordingly.

#### Configure Okta FGA

1. Add the model: Under Model Explorer update the model to contain the model below:

    ```
    model
      schema 1.1
    
    type user
    
    type doc
      relations
        define owner: [user]
        define viewer: [user, user:*]
        define can_view: viewer or owner
        define can_edit: owner
    
    ```

2. Create a client: Navigate to *Settings* and in the *Authorized Clients* section click **+ Create Client** button. On the new page give your client a name and mark all three client permissions then click **Create**.
  
3. Copy the information on the modal and update your `.env` file with the values you now have for `FGA_STORE_ID`, `FGA_CLIENT_ID`, and `FGA_CLIENT_SECRET`.

### How to run it

1. Install dependencies. If you want to run with local dependencies follow root instructions.

   ```sh
   npm install
   ```

2. Initialize Okta FGA with the necessary model and tuples.

   ```sh
   npm run fga:init
   ```

3. Running the example
   ```sh
   npm run dev
   ```

## License

Apache-2.0
