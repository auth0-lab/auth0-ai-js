import { UIMessage, Tool, UIMessageStreamWriter } from "ai";

import { invokeTools } from "./invokeTools";

type ExecuteFN = (dataStream: { writer: UIMessageStreamWriter<UIMessage> }) => Promise<void> | void;

export function withInterruptions(
  fn: ExecuteFN,
  config: {
    messages: UIMessage[];
    tools: {
      [key: string]: Tool;
    };
  }
): (dataStream: any) => Promise<void> {
  return async (dataStream: { writer: UIMessageStreamWriter<UIMessage> }): Promise<void> => {
    await invokeTools({
      messages: config.messages,
      tools: config.tools,
    });
    await fn(dataStream);
  };
}
