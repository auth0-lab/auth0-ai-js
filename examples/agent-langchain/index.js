import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { z } from "zod";

const buyTool = tool(async ({ ticker, qty }) => {
  console.log('buy stock!');
  console.log(ticker)
  console.log(qty)
}, {
  name: "buy",
  description: "Use this function to buy stock",
  schema: z.object({
    ticker: z.string(),
    qty: z.number()
  })
});

const tools = [ buyTool ];
const toolNode = new ToolNode(tools); 

const model = new ChatOpenAI({ model: "gpt-4" }).bindTools(tools);

export async function prompt(message) {
  console.log('LangChain prompt:');
  console.log(message);

  const messages = [
    new HumanMessage(message),
  ];

  var rv = await model.invoke(messages);
  console.log(rv);
}
