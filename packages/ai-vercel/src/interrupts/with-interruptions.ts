import { DataStreamWriter, Message, Tool } from "ai";

import { invokeTools } from "./invokeTools";

type ExecuteFN = (dataStream: DataStreamWriter) => Promise<void> | void;

export function withInterruptions(
  fn: ExecuteFN,
  config: {
    messages: Message[];
    tools: {
      [key: string]: Tool;
    };
  }
): (dataStream: DataStreamWriter) => Promise<void> {
  return async (dataStream: any): Promise<void> => {
    await invokeTools({
      messages: config.messages,
      tools: config.tools,
    });
    await fn(dataStream);
  };
}
