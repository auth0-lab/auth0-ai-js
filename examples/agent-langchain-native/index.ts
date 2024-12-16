import 'dotenv/config'
import { defineCommand, runMain } from 'citty';
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, Annotation, messagesStateReducer, MemorySaver, NodeInterrupt } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { z } from "zod";
import { parseWWWAuthenticateHeader } from 'http-auth-utils';

const buyTool = tool(async ({ ticker, qty }, config) => {
  console.log('buy stock!');
  console.log(ticker)
  console.log(qty)
  console.log('---')
  console.log(config)
  
  var store = config.store;
  console.log('STORE')
  console.log(store)
  
  const headers = {
    'Content-Type': 'application/json'
  };
  const body = {
    ticker: ticker,
    qty: qty
  };
  
  /*
  const accessToken = tokens().accessToken;
  if (accessToken) {
    headers['Authorization'] = 'Bearer ' + accessToken.value;
  }
  */
  
  const response = await fetch('http://localhost:8081/', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  });
  if (response.status == 401) {
    const challenge = parseWWWAuthenticateHeader(response.headers.get('WWW-Authenticate'));
    
    console.log('CHALLENGE!');
    console.log(challenge);
    
    //console.log(challenge);
    //throw new Error('You need authorization to buy stock', 'insufficient_scope', { scope: challenge.data.scope });
    //throw new NodeInterrupt(`Received input that is longer than 5 characters`, { foo: 'bar' });
    //var i = new NodeInterrupt(`Received input that is longer than 5 characters`, { foo: 'bar' });
    //var i = new NodeInterrupt({ bar: 'baz' }, { foo: 'bar' });
    //i.scope = 'foo';
    //throw i;
    
    //throw new Error('i need a human to be in the loop')
    throw new NodeInterrupt('i need a human to be in the loop');
    //throw new NodeInterrupt({ bar: 'baz' }, { foo: 'bar' });
  }
  
  var json = await response.json();
  console.log(json);
  return 'OK';
}, {
  name: "buy",
  description: "Use this function to buy stock",
  schema: z.object({
    ticker: z.string(),
    qty: z.number()
  })
});

const interruptedStep = async (state: typeof StateAnnotation.State) => {
  // Let's optionally raise a NodeInterrupt
  // if the length of the input is longer than 5 characters
  //if (state.input?.length > 5) {
  //  throw new NodeInterrupt(`Received input that is longer than 5 characters: ${state.input}`);
  //}
  //console.log("---Step 2---");
  //throw new Error('something is wrong')
  //throw new NodeInterrupt(`something is interrupted`);
  
  //throw new NodeInterrupt({ bar: 'baz' });
  
  return state;
};


const tools = [ buyTool ];
// NOTE: handleToolErrors: false seems to be necessary to get NodeInterrupt bubbled up from tool-wrapped functions
const toolNode = new ToolNode(tools, { xhandleToolErrors: false });

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
  .addNode("inter", interruptedStep)
  .addEdge("__start__", "agent")
  .addEdge("agent", "inter")
  //.addConditionalEdges("agent", shouldContinue)
  .addConditionalEdges("inter", shouldContinue)
  .addEdge("tools", "agent");

// Initialize memory to persist state between graph runs
const checkpointer = new MemorySaver();

// Finally, we compile it!
// This compiles it into a LangChain Runnable.
// Note that we're (optionally) passing the memory when compiling the graph
// FIXME the checkpointer is saving the tool call that threw the exception.
const app = workflow.compile({ checkpointer });
//const app = workflow.compile();


export async function prompt(message, user) {
  console.log('LangChain prompt:');
  console.log(message);

  let config = {
    configurable: {
      thread_id: "1",
      user: user
    },
    streamMode: "values" as const
  };


  const messages = [
    new HumanMessage(message),
  ];

  //var rv = await model.invoke(messages);
  //var rv = await app.invoke({ messages: messages}, config);
  
  const stream = await app.stream({ messages: messages}, config);
  for await (const event of stream) {
    console.log(event);
  }
  
  const state = await app.getState(config);
  console.log('---');
  console.log(state.next);
  console.log(state.tasks);
  if (state.tasks[0]) {
    console.log(state.tasks[0].interrupts)
  }
  
  
  //console.log(rv.messages[rv.messages.length - 1].content);
}

//prompt("Buy 100 shares of ZEKO");


const main = defineCommand({
  meta: {
    name: "agent",
    version: "0.0.0",
    description: "An example AI trader with human approval",
  },
  args: {
    message: {
      type: "positional",
      description: "A message to the agent",
      required: false,
    },
    username: {
      alias: "u",
      type: "string",
      description: "Identifier for the user",
    }
  },
  async run({ args }) {
    console.log('main!')
    console.log(args)
    
    const user = {
      id: args.username
    }
    
    prompt(args.message, user);
  },
});

runMain(main);
