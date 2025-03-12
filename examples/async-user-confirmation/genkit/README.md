# Step Up Auth for Tools with Genkit

## Getting Started

### Prerequisites

- An OpenAI account and API key create one [here](https://platform.openai.com).

#### `.env` file

```sh
# Auth0
AUTH0_DOMAIN="<auth0-domain>"
# Client for CIBA
AUTH0_CLIENT_ID="<auth0-client-id>"
AUTH0_CLIENT_SECRET="<auth0-client-secret>"
# Client for Device Flow / Native
AUTH0_PUBLIC_CLIENT_ID="<auth0-public-client-id>"
AUTH0_PUBLIC_CLIENT_SECRET="<auth0-public-client-secret>"

# API
API_URL=http://localhost:8081/
AUDIENCE=http://localhost:8081

# OpenAI
OPENAI_API_KEY="openai-api-key"
```

### How to run it

1. Install dependencies. If you want to run with local dependencies follow root instructions.

   ```sh
   npm install
   ```

2. Running the API

   ```sh
   npm run start:api
   ```

3. Running the example
   ```sh
   npm start
   ```

## License

Apache-2.0
