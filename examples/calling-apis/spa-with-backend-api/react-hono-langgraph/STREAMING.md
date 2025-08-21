# React + Hono + LangGraph SDK Streaming with Auth0

This example demonstrates a modern streaming AI chat application using the official LangGraph SDK for React, with seamless Auth0 authentication and interrupt handling.

## Architecture

### Server (Hono)
- **LangGraph SDK Compatible**: Implements LangGraph SDK-compatible streaming endpoints
- **Server-Sent Events**: Uses Hono's `streamSSE` for efficient real-time streaming
- **Auth0 interrupts**: Supports `FederatedConnectionInterrupt` for secure API access
- **JWT authentication**: All endpoints protected with Auth0 JWT middleware

### Client (React)
- **LangGraph SDK React Hook**: Uses `useStream` from `@langchain/langgraph-sdk/react`
- **Native stream handling**: Leverages official LangGraph streaming patterns
- **Auth0 integration**: Automatic OAuth popup flow for API access interrupts
- **TypeScript**: Full type safety with LangGraph SDK types

### Shared Types
- **LangGraph SDK types**: Extends official types from `@langchain/langgraph-sdk`
- **Auth0 AI types**: Custom interrupt handling types for seamless OAuth flow

## Key Features

1. **LangGraph SDK streaming**: Uses official React hooks for robust streaming
2. **Auth0 integration**: Seamless OAuth interrupts for secure API access
3. **TypeScript**: Full type safety across client, server, and shared packages
4. **Real-time**: Messages stream with proper backpressure and error handling

## Endpoints

### LangGraph SDK Compatible
- `POST /api/langgraph/assistants/:assistantId/threads/:threadId/runs/stream` - Stream chat responses
- `POST /api/langgraph/assistants/:assistantId/threads` - Create new conversation thread

### Additional APIs
- `GET /api/external` - Protected API example (requires Auth0 token)
- `GET /hello` - Public API example
- `GET /` - Health check

## Request/Response Format

### Thread Creation
```json
POST /api/langgraph/assistants/:assistantId/threads
{
  "metadata": {},
  "config": {}
}

Response:
{
  "thread_id": "uuid-v4-string",
  "created_at": "2024-01-01T00:00:00Z",
  "metadata": {},
  "status": "idle"
}
```

### Streaming Chat
```json
POST /api/langgraph/assistants/:assistantId/threads/:threadId/runs/stream
{
  "input": {
    "messages": [
      { "type": "human", "content": "Hello!" }
    ]
  },
  "config": {},
  "streamMode": "messages"
}
```

Streams LangGraph SDK compatible events:
```
event: data
data: [0,"messages",{"content":"Hello!","additional_kwargs":{},"response_metadata":{},"type":"ai","name":null,"id":"msg_id"}]

event: data  
data: [1,"end"]
```

## Auth0 Interrupts

When the AI agent needs to access protected APIs, the server sends a `FederatedConnectionInterrupt`:

```typescript
// Server throws interrupt
throw new FederatedConnectionInterrupt({
  connection_id: "api-connection",
  connection_type: "API_KEY", 
  // ... interrupt details
});
```

The client's `useStream` hook automatically:
1. Detects the interrupt in the stream
2. Opens Auth0 popup for OAuth consent
3. Resumes the stream with the new access token
4. Continues the conversation seamlessly

