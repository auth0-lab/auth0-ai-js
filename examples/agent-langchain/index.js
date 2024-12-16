import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation, messagesStateReducer, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { z } from "zod";
import { user } from '@auth0/ai/user';
import { tokens } from '@auth0/ai/tokens';
import { AuthorizationError } from '@auth0/ai';
import { parseWWWAuthenticateHeader } from 'http-auth-utils';

const buyTool = tool(async ({ ticker, qty }, config) => {
  console.log('buy stock!');
  console.log(ticker)
  console.log(qty)
  console.log('---')
  console.log(config)
  
  const u = user();
  console.log('Buying stock for user: ')
  console.log(u);
  
  const headers = {
    'Content-Type': 'application/json'
  };
  const body = {
    ticker: ticker,
    qty: qty
  };
  
  const accessToken = tokens().accessToken;
  if (accessToken) {
    headers['Authorization'] = 'Bearer ' + accessToken.value;
  }
  
  const response = await fetch('http://localhost:8081/', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  });
  if (response.status == 401) {
    const challenge = parseWWWAuthenticateHeader(response.headers.get('WWW-Authenticate'));
    console.log(challenge);
    throw new AuthorizationError('You need authorization to buy stock', 'insufficient_scope', { scope: challenge.data.scope });
  }
  
  var json = await response.json();
  return 'OK';
}, {
  name: "buy",
  description: "Use this function to buy stock",
  schema: z.object({
    ticker: z.string(),
    qty: z.number()
  })
});

const tools = [ buyTool ];
const toolNode = new ToolNode(tools, { handleToolErrors: false });

const model = new ChatOpenAI({ model: "gpt-4" }).bindTools(tools);

// Define the function that determines whether to continue or not
// We can extract the state typing via `StateAnnotation.State`
function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}

// Define the function that calls the model
async function callModel(state) {
  const messages = state.messages;
  const response = await model.invoke(messages);

  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}

const StateAnnotation = Annotation.Root({
  messages: Annotation({
    // `messagesStateReducer` function defines how `messages` state key should be updated
    // (in this case it appends new messages to the list and overwrites messages with the same ID)
    reducer: messagesStateReducer,
  }),
});

// Define a new graph
const workflow = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

// Initialize memory to persist state between graph runs
const checkpointer = new MemorySaver();

// Finally, we compile it!
// This compiles it into a LangChain Runnable.
// Note that we're (optionally) passing the memory when compiling the graph
// FIXME the checkpointer is saving the tool call that threw the exception.
//const app = workflow.compile({ checkpointer });
const app = workflow.compile();


export async function prompt(message) {
  console.log('LangChain prompt:');
  console.log(message);

  const messages = [
    new HumanMessage(message),
  ];

  //var rv = await model.invoke(messages);
  var rv = await app.invoke({ messages: messages}, { configurable: { thread_id: "42" } });
  console.log(rv.messages[rv.messages.length - 1].content);
}
