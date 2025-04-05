import { useAgentChat } from "agents/ai-react";
import { Message } from "ai";

import { Auth0InterruptionUI, useInterruptions } from "@auth0/ai-vercel/react";

export const useAgentChatInterruptions = <State>(
  options: Parameters<typeof useAgentChat<State>>[0]
): ReturnType<typeof useInterruptions> & ReturnType<typeof useAgentChat> => {
  const { agent } = options;
  const result = useInterruptions((handler) => {
    const onError =
      options.onError ?? ((error) => console.error("Chat error:", error));
    const { setMessages, ...rest } = useAgentChat({
      ...options,
      onError: handler(onError),
    });
    return {
      setMessages: setMessages as (
        messages: Message[] | ((messages: Message[]) => Message[])
      ) => void,
      ...rest,
    };
  }) as ReturnType<typeof useInterruptions> & ReturnType<typeof useAgentChat>;
  const { toolInterrupt, ...rest } = result;
  let ti: Auth0InterruptionUI | null = null;

  if (toolInterrupt) {
    ti = {
      ...toolInterrupt,
      resume: () => {
        //forces a socket reconnect so that
        //new token are sent to the agent
        agent.addEventListener(
          "open",
          () => {
            //TODO: this doesn't work if executed immediately, why?
            setTimeout(() => {
              toolInterrupt.resume();
            }, 100);
          },
          { once: true }
        );
        agent.reconnect();
      },
    };
  }

  return { toolInterrupt: ti, ...rest };
};
