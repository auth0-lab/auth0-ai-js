# Step Up Auth for Tools with LangChain

## Getting Started

#### `.env` file

```sh
# Auth0
AUTH0_DOMAIN="<auth0-domain>"
AUTH0_CLIENT_ID="<auth0-client-id>"
AUTH0_CLIENT_SECRET="<auth0-client-secret>"

# API
API_URL=http://localhost:8081/
AUDIENCE=http://localhost:8081

# OpenAI
OPENAI_API_KEY="openai-api-key"

# Langchain
LANGGRAPH_API_URL="http://localhost:54367"
```

### How to run it

1. Install dependencies. If you want to run with local dependencies follow root instructions.

   ```sh
   $ npm install
   ```

2. Running the API

   ```sh
   npm run start:api
   ```

3. Running the scheduler

   ```sh
   npm run scheduler:up
   ```

4. Running the example
   ```sh
   npm run dev
   ```

### How this works

```mermaid
sequenceDiagram
    participant User
    participant Agent
    participant Conditional Trade Agent
    participant CIBA Agent
    participant Auth0
    participant Stocks API
    participant User' Phone

User->>Agent: "Buy 10 NVDA when P/E above 15"
Agent->>+Conditional Trade Agent: Monitor Conditional Trade
Agent-->>User: "I've started a conditional trade"
loop Every 10 mins
    Conditional Trade Agent->>Stocks API: Check P/E ratio
    Stocks API-->>Conditional Trade Agent:
    alt P/E > 15
        Conditional Trade Agent->>Auth0: Initiate CIBA request
        Auth0->>User' Phone: Send push notification
        Conditional Trade Agent->>+CIBA Agent: Monitor user response
        loop Every minute
            CIBA Agent->>Auth0: Check user approval status
            Auth0-->>CIBA Agent:
            alt User approves
                User' Phone-->>Auth0: User approves
                Auth0-->>CIBA Agent: User approves

            end
        end
    end
    CIBA Agent-->>Conditional Trade Agent: User approves
end
    Conditional Trade Agent->>Stocks API: Execute trade for 10 NVDA
    Stocks API->>Conditional Trade Agent: Trade executed
    Conditional Trade Agent->>User' Phone: Inform user
```

## License

Apache-2.0
