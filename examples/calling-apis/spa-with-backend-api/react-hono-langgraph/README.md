# Chat SPA Application with Auth0 AI, LangGraph, and Federated Connection with Access Tokens

This example demonstrates a Single Page Application (SPA) chatbot with LangGraph backend using Federated Connections with Access Tokens for secure third-party API access. Unlike the AI SDK example, this implementation uses LangGraph's state graph approach with custom authentication for enhanced security and flexibility.

## Features

- **LangGraph State Graph**: Uses LangGraph's state management for complex conversation flows
- **Custom Authentication**: Implements LangGraph's new custom auth approach (not the deprecated passthrough library)
- **Federated Token Exchange**: Secure access to Google Calendar API through Auth0's token vault
- **Real-time Streaming**: Server-sent events for responsive chat experience
- **Full-Stack TypeScript**: End-to-end type safety
- **Modern Stack**:
  - [Node.js](https://nodejs.org) runtime
  - [Hono](https://hono.dev) backend framework
  - [LangGraph](https://langchain-ai.github.io/langgraphjs/) for agent orchestration
  - [React](https://react.dev) frontend
  - [Vite](https://vitejs.dev) for frontend bundling

## Project Structure

```
.
├── client/               # React frontend
├── server/               # Hono backend with LangGraph
├── shared/               # Shared TypeScript definitions
├── package.json          # Root package.json with workspaces
└── turbo.json           # Turbo configuration
```

## Differences from AI SDK Example

This LangGraph implementation differs from the `react-hono-ai-sdk` example in several key ways:

1. **Agent Architecture**: Uses LangGraph's StateGraph instead of AI SDK's tool calling
2. **Authentication**: Implements custom Auth0 authentication pattern for LangGraph
3. **Streaming**: Custom SSE implementation instead of AI SDK's built-in streaming
4. **Tool Management**: Tools are wrapped with Auth0AI's federated connection handlers
5. **State Management**: Persistent conversation state through LangGraph's memory system

## Setup Instructions

### Prerequisites

- Node.js 18 or later
- npm 7 or later (for workspace support)
- [OpenAI API key](https://platform.openai.com/docs/libraries#create-and-export-an-api-key)
- Google Cloud Project with Calendar API enabled
- Auth0 tenant with proper configuration

### 1. Auth0 Configuration

Follow the same Auth0 setup as the AI SDK example:

1. **Single Page Application**: Configure callback URLs, logout URLs, and web origins
2. **Auth0 API**: Create with offline access enabled
3. **Resource Server Client**: For federated token exchange
4. **Google Social Connection**: With Calendar scopes and Token Vault enabled

### 2. Environment Variables

#### Server (.env)
```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=your-api-identifier

# Resource Server Client (for federated token exchange)
RESOURCE_SERVER_CLIENT_ID=your-resource-server-client-id
RESOURCE_SERVER_CLIENT_SECRET=your-resource-server-client-secret

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Server Configuration
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Google Connection Name
GOOGLE_CONNECTION_NAME=google-oauth2
```

#### Client (.env)
```bash
# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=your-api-identifier

# Server Configuration
VITE_SERVER_URL=http://localhost:3000
```

### 3. Installation and Development

```bash
# Install dependencies
npm install

# Build shared packages
npm run build

# Start development servers (both client and server)
npm run dev

# Or start individually
npm run dev:client  # Client only (port 5173)
npm run dev:server  # Server only (port 3000)
```

## Key Components

### LangGraph Agent (`server/src/lib/agent.ts`)

The heart of the application using LangGraph's StateGraph:

- **State Management**: Uses MessagesAnnotation for conversation state
- **Tool Integration**: Binds calendar tools to the OpenAI model
- **Flow Control**: Conditional edges for tool calling vs. completion
- **Memory**: Built-in checkpointer for conversation persistence

### Custom Authentication (`server/src/lib/auth.ts`)

Auth0AI integration for federated connections:

- **Token Exchange**: Converts user access tokens to Google API tokens
- **Scope Management**: Handles Calendar API permissions
- **Error Handling**: Manages federated connection interrupts

### Calendar Tools

Two main tools demonstrate federated API access:

1. **`checkUserCalendar`**: Checks availability for specific dates
2. **`listUserCalendars`**: Lists all accessible calendars

### Streaming Implementation (`server/src/index.ts`)

Custom Server-Sent Events implementation:

- **LangGraph Streaming**: Uses graph.stream() for real-time responses
- **Error Handling**: Graceful handling of connection and auth errors
- **Message Format**: Compatible with frontend chat interface

## Usage

1. **Authentication**: Users log in through Auth0
2. **Chat Interface**: Ask questions about calendar events
3. **Federated Connection**: First calendar request triggers Google OAuth
4. **Tool Execution**: LangGraph agent uses calendar tools transparently
5. **Streaming Responses**: Real-time conversation flow

### Example Interactions

- "What meetings do I have today?"
- "Show me my calendars"
- "Am I free tomorrow at 3 PM?"
- "List my upcoming events"

## Security Features

- **JWT Validation**: Server validates Auth0 access tokens
- **Federated Exchange**: Secure token exchange for Google API access
- **Scope Limitation**: Only Calendar read permissions requested
- **Custom Auth**: LangGraph custom authentication for enhanced security

## Development Notes

This example demonstrates the new LangGraph custom authentication pattern, moving away from deprecated passthrough approaches. The implementation showcases how to integrate Auth0's federated connections with LangGraph's agent framework while maintaining the SPA + backend API architecture.
