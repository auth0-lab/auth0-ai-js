import { useInterruptions } from "@auth0/ai-vercel/react";
import { useAgentChat } from "agents/ai-react";
import type { Message } from "ai";

export const useAgentChatInterruptions = <State>(
  options: Parameters<typeof useAgentChat<State>>[0]
) =>
  useInterruptions((handler) => {
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
