import { Auth0Interrupt } from "@auth0/ai/interrupts";
import { GraphInterrupt } from "@langchain/langgraph";

export const toGraphInterrupt = (interrupt: Auth0Interrupt): GraphInterrupt => {
  return new GraphInterrupt([
    {
      value: interrupt,
      when: "during",
      resumable: true,
      ns: [`auth0AI:${interrupt.name}:${interrupt.code}`],
    },
  ]);
};
