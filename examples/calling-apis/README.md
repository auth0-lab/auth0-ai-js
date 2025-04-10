## Calling APIs on user's behalf

Calling APIs on user's behalf allows you to use secure standards to call APIs from tools, integrating your app with other products. These examples demonstrate how to integrate **Auth0 AI SDK** with **AI SDK**, **LangGraph**, **LlamaIndex**, **Genkit** and others to call APIs on behalf of users. For more information, refer to the [documentation](https://demo.auth0.ai/docs/call-apis-on-users-behalf).

### How It Works

1. **User Request**: A user submits a request to execute a tool that requires calling an external API.
2. **Permissions check**: Auth0 AI SDK verifies the user's permissions and checks the external API authorization requirements.
3. **Response Generation**: Base on the required permissions, the system generates a response tailored to request users's explicit authorization.
4. **User Authorization**: The user reviews the request and provides consent if they choose to proceed.
5. **Token Generation**: The system generates a token for the user to access the external API.
6. **API Call**: The system calls the external API on behalf of the user, using the tool parameters from the User's original request.
7. **Tool Execution**: The system executes the tool, incorporating the API response into the final output.
8. **User Response**: The user receives the final output, which may include information retrieved from the external API.

### Diagram

Below is a high-level workflow:

<p align="center">
  <img
    style="margin-left: auto; margin-right: auto; padding: 10px; background: #4a4a4a; border-radius: 10px; max-height: 500px;"
    src="https://cdn.auth0.com/website/auth0-lab/ai/sdks/diagrams/calling-apis-on-user-behalf.png"
  />
<p>

### Examples

Explore the following examples demonstrating how to call APIs on user's behalf:

- **LangGraph:**  
   An implementation showcasing how integrate `@auth0/ai-langchain` with LangChain to call APIs on user's behalf.  
   [View Example](/examples/calling-apis/langgraph/)

- **AI SDK:**  
   An implementation showcasing how integrate `@auth0/ai-vercel` with AI SDK to call APIs on user's behalf.  
   [View Example](/demos/nextjs-ai/app/(ai-sdk)/)

- **LlamaIndex:**  
   An implementation showcasing how integrate `@auth0/ai-llamaindex` with LlamaIndex to call APIs on user's behalf.  
   [View Example](/demos/nextjs-ai/app/(llamaindex)/)

- **GenKit:**  
   An implementation showcasing how integrate `@auth0/ai-genkit` with GenKit to call APIs on user's behalf.  
   [View Example](/demos/nextjs-ai/app/(genkit)/)