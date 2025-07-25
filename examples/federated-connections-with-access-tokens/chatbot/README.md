# Chat SPA Application with Auth0 AI and AI SDK and Federated Connection Access Tokens

The following app demonstrates using a SPA chatbot application, a backend API (and a linked API client), and a federated
connection to a third party API.

## Features

This template leverages [bhvr](https://github.com/stevedylandev/bhvr) template for building a React SPA application with a Hono API.

- **Full-Stack TypeScript**: End-to-end type safety between client and server
- **Shared Types**: Common type definitions shared between client and server
- **Monorepo Structure**: Organized as a workspaces-based monorepo with Turbo for build orchestration
- **Modern Stack**:
  - [Bun](https://bun.sh) as the JavaScript runtime and package manager
  - [Hono](https://hono.dev) as the backend framework
  - [Vite](https://vitejs.dev) for frontend bundling
  - [React](https://react.dev) for the frontend UI
  - [Turbo](https://turbo.build) for monorepo build orchestration and caching

## Project Structure

```
.
├── client/               # React frontend
├── server/               # Hono backend
├── shared/               # Shared TypeScript definitions
│   └── src/types/        # Type definitions used by both client and server
├── package.json          # Root package.json with workspaces
└── turbo.json            # Turbo configuration for build orchestration
```

## Setup Instructions

### Prerequisites

You will need the following prerequisites to run this app:
- An [OpenAI key](https://platform.openai.com/docs/libraries#create-and-export-an-api-key) for accessing OpenAI
- Setup and configure a Google Cloud Project for use with the Google Connection
   - Enable the [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com).
   - Create OAuth 2.0 credentials with proper redirect URIs.

### 1. Auth0 Configuration

1. Create an Auth0 Application:
   - Go to your [Auth0 Dashboard](https://manage.auth0.com/)
   - Create a new **Single Page Application**
   - Configure the following settings:
     - **Allowed Callback URLs**: `http://localhost:5173`
     - **Allowed Logout URLs**: `http://localhost:5173`
     - **Allowed Web Origins**: `http://localhost:5173`
     - Make sure to Allow Refresh Token in Grant Types  under Advanced Settings but you can disable "Allow Refresh Token Rotation"

2. Create an Auth0 API:
   - In your Auth0 Dashboard, go to APIs
   - Create a new API with an identifier (audience)
   - Make sure to "Allow Offline Access" in Access Settings 
   - Note down the API identifier for your environment variables

3. Create a Resource Server Client (for Federated Token Exchange):
   - This is a special client that allows your API server to perform token exchanges
   - Create this client programmatically via the Auth0 Management API:
   ```json
   {
     "name": "Calendar API Resource Server Client",
     "app_type": "resource_server",
     "resource_server_identifier": "YOUR_API_IDENTIFIER"
   }
   ```

   A sample curl to create this Resource Server client (linked client):
  ```bash
    curl -L 'https://login0.local.dev.auth0.com/api/v2/clients' \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json' \
      -H 'Authorization: Bearer {YOUR_MANAGEMENT_API2_TOKEN}' \
      -d '{
        "name": "Calendar API Resource Server Client",
        "app_type": "resource_server",
        "grant_types": ["urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token"],
        "resource_server_identifier": "YOUR_API_IDENTIFIER"
      }'
  ```
   - Note down the `client_id` and `client_secret` for your environment variables
   - This client enables federated token exchange to get access tokens for external connections (e.g., Google Calendar)

4. Configure a Social Connection for Google in Auth0
   - Make sure to enable all `Calendar` scopes from the Permissions options
   - Make sure to enable Token Vault for the Connection under the Advanced Settings
   - Make sure to enable the connection for your SPA Application created in Step 1
   - Test the connection in Auth0 "Try Connection" screen and make sure connection is working & configured correctly

### 2. Environment Variables

#### Client (.env)
Copy `.env.example` to `.env` and fill in your Auth0 configuration:

```bash
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=your-api-identifier
VITE_SERVER_URL=http://localhost:3000
```

#### Server (.env)
Copy `.env.example` to `.env` and fill in your Auth0 configuration:

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=your-api-identifier

# Resource Server Client Configuration (for federated token exchange)
# These credentials belong to a special "resource_server" client that can perform token exchanges
LINKED_CLIENT_ID=your-resource-server-client-id
LINKED_CLIENT_SECRET=your-resource-server-client-secret

# OpenAI Configuration  
OPENAI_API_KEY=your-openai-api-key

# Server Configuration
PORT=3000
```

### 3. Install Dependencies

```bash
# Install all dependencies from the project root
bun install
```

### 4. Run the Application

#### Start server and client in development mode with Turbo:
```bash
bun run dev
```

or run them individually with:
```bash
bun run dev:client    # Run the Vite dev server for React
bun run dev:server    # Run the Hono backend
```

The client will be available at `http://localhost:5173` and will communicate with the server at `http://localhost:3000`.

## Features

- **Authentication**: Users can log in/out using Auth0 Universal Login
- **Protected API Calls**: Authenticated users can call protected endpoints with JWT tokens
- **Public API Calls**: Non-authenticated users can still call public endpoints
- **AI Chat Integration**: Authenticated users can chat with an AI assistant about their calendar
- **Federated Token Exchange**: Server performs token exchanges to access external APIs (Google Calendar) on behalf of users
- **Type Safety**: Full TypeScript support with shared types between client and server

## API Endpoints

- `GET /` - Public endpoint returning "Hello Hono!"
- `GET /hello` - Public endpoint returning JSON response
- `GET /api/external` - Protected endpoint requiring valid JWT token
- `POST /chat` - Protected AI chat endpoint with calendar integration (federated token exchange)

## Architecture

### Client (React + Vite)
- Uses `@auth0/auth0-spa-js` for authentication
- React Context for Auth0 state management
- Custom hook (`useAuth0`) for accessing auth state
- JWT tokens are automatically included in API calls

### Server (Hono + Bun)
- Custom JWT middleware using `jose` library
- Validates tokens against Auth0's JWKS endpoint
- Type-safe API endpoints with shared types
- CORS configured for client-server communication

## Key Files

- `client/src/lib/auth0.ts` - Auth0 client configuration
- `client/src/contexts/Auth0Context.tsx` - React context provider
- `client/src/hooks/useAuth0.ts` - Auth0 hook for components
- `server/src/middleware/auth.ts` - JWT validation middleware
- `server/src/index.ts` - Hono server with protected routes
- `shared/src/types/index.ts` - Shared TypeScript types

This setup provides a solid foundation for building Auth0-protected Single Page Applications with a secure API backend.

### Additional Commands

```bash
# Build all workspaces with Turbo
bun run build

# Or build individual workspaces directly
bun run build:client  # Build the React frontend
bun run build:server  # Build the Hono backend

# Lint all workspaces
bun run lint

# Type check all workspaces
bun run type-check

# Run tests across all workspaces
bun run test
```

### Deployment

Deplying each piece is very versatile and can be done numerous ways, and exploration into automating these will happen at a later date. Here are some references in the meantime.

**Client**
- [Orbiter](https://orbiter.host)
- [GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages)
- [Netlify](https://vite.dev/guide/static-deploy.html#netlify)
- [Cloudflare Pages](https://vite.dev/guide/static-deploy.html#cloudflare-pages)

**Server**
- [Cloudflare Worker](https://gist.github.com/stevedylandev/4aa1fc569bcba46b7169193c0498d0b3)
- [Bun](https://hono.dev/docs/getting-started/bun)
- [Node.js](https://hono.dev/docs/getting-started/nodejs)

## Type Sharing

Types are automatically shared between the client and server thanks to the shared package and TypeScript path aliases. You can import them in your code using:

```typescript
import { ApiResponse } from 'shared/types';
```