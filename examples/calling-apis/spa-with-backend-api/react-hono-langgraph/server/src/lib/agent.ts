import { AIMessage } from "@langchain/core/messages";
import {
  END,
  InMemoryStore,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import { createGoogleCalendarTool } from "./auth";
import { createListNearbyEventsTool } from "./tools/listNearbyEvents";
import { createListUserCalendarsTool } from "./tools/listUserCalendars";

import type { RunnableLike } from "@langchain/core/runnables";
import type { Context } from "hono";

/**
LangGraph Execution Flow (with tool_calls? branching logic)

                       +-----------+
        +--------+     | callLLM   |----- false ----+
        | START  | --> +-----------+                |
        +--------+           |                      v
                             |                 +--------+
                             |                 |  END   |
                             |                 +--------+
                             |
                             v
                      [tool_calls?]
                          /   \
                         /     \
                   true /       \ false
                       /         \
                      v           \
               +------------+      \
               |   tools    | <-----+
               +------------+
                      |
                      v
                +-----------+
                |  callLLM  |
                +-----------+

Node Summary:

1. START
   - Graph entry point.
   - Edge: → callLLM

2. callLLM
   - Invokes the LLM with `state.messages`.
   - Appends an AIMessage to `messages`.
   - Conditional branch based on last AI message:
     → If `tool_calls?.length > 0` → tools      (true)
     → Else → END                                (false)

3. tools
   - Executes tools requested by LLM (e.g. listNearbyEvents, listUserCalendars).
   - Appends tool output messages to `messages`.
   - Edge: → callLLM (loop continues)

4. END
   - Terminates graph execution.

Routing Logic:
const routeAfterLLM = (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  return lastMessage.tool_calls?.length ? "tools" : END;
};

State Shape:
{
  messages: BaseMessage[];
  // Includes user inputs, AI messages, tool calls, and tool outputs
}

Execution Example:
User: "What's on my calendar tomorrow?"

- START
  → callLLM (LLM decides it needs a tool)
- tool_calls? → true
  → tools (runs calendar tool, appends output)
  → callLLM (LLM sees tool output, finishes reasoning)
- tool_calls? → false
  → END

Suggested Stream Modes:
streamMode: ["updates", "values", "messages"]
- "updates": Emits only changed keys in state (e.g. new messages)
- "values": Emits full state after each step
- "messages": Emits console-style logs from inside nodes
*/

export const createGraph = (c: Context) => {
  // Create the Google Calendar tool wrapper with auth context
  const withGoogleCalendar = createGoogleCalendarTool(c);

  // Create tools with the auth wrapper
  const listNearbyEvents = createListNearbyEventsTool(withGoogleCalendar);
  const listUserCalendars = createListUserCalendarsTool(withGoogleCalendar);

  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
  }).bindTools([listNearbyEvents, listUserCalendars]);

  const callLLM = async (state: typeof MessagesAnnotation.State) => {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  };

  const routeAfterLLM: RunnableLike = function (state) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    if (!lastMessage.tool_calls?.length) {
      return END;
    }
    return "tools";
  };

  const stateGraph = new StateGraph(MessagesAnnotation)
    .addNode("callLLM", callLLM)
    .addNode(
      "tools",
      new ToolNode([listNearbyEvents, listUserCalendars], {
        // Error handler should be disabled in order to
        // trigger interruptions from within tools.
        handleToolErrors: false,
      })
    )
    .addEdge(START, "callLLM")
    .addConditionalEdges("callLLM", routeAfterLLM, [END, "tools"])
    .addEdge("tools", "callLLM");

  const checkpointer = new MemorySaver();
  const store = new InMemoryStore();

  return stateGraph.compile({
    checkpointer,
    store,
  });
};
