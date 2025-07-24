# Auth0 SPA Integration with Hono API

This example demonstrates how to integrate Auth0 SPA JS into a React client and validate JWT tokens in a Hono server, following the patterns from [Auth0's official JavaScript samples](https://github.com/auth0-samples/auth0-javascript-samples/tree/master/02-Calling-an-API).

## Setup Instructions

### 1. Auth0 Configuration

1. Create an Auth0 Application:
   - Go to your [Auth0 Dashboard](https://manage.auth0.com/)
   - Create a new **Single Page Application**
   - Configure the following settings:
     - **Allowed Callback URLs**: `http://localhost:5173`
     - **Allowed Logout URLs**: `http://localhost:5173`
     - **Allowed Web Origins**: `http://localhost:5173`

2. Create an Auth0 API:
   - In your Auth0 Dashboard, go to APIs
   - Create a new API with an identifier (audience)
   - Note down the API identifier for your environment variables

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
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=your-api-identifier
PORT=3000
```

### 3. Install Dependencies

```bash
# Install all dependencies from the project root
bun install
```

### 4. Run the Application

#### Start the server:
```bash
cd server
bun run dev
```

#### Start the client (in a new terminal):
```bash
cd client
bun run dev
```

The client will be available at `http://localhost:5173` and will communicate with the server at `http://localhost:3000`.

## Features

- **Authentication**: Users can log in/out using Auth0 Universal Login
- **Protected API Calls**: Authenticated users can call protected endpoints with JWT tokens
- **Public API Calls**: Non-authenticated users can still call public endpoints
- **Type Safety**: Full TypeScript support with shared types between client and server

## API Endpoints

- `GET /` - Public endpoint returning "Hello Hono!"
- `GET /hello` - Public endpoint returning JSON response
- `GET /api/external` - Protected endpoint requiring valid JWT token

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
