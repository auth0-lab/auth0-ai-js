import { Client } from "@langchain/langgraph-sdk";

import { CibaPollerGraph } from "../sdk/ciba-poller-graph";

const cibaGraph = CibaPollerGraph({
  onStopScheduler: async (state) => {
    // Custom scheduler
    const schedulerClient = new Client({
      apiUrl: "http://localhost:5555",
    });

    await schedulerClient.crons.delete(state.task_id);
  },
});

export const graph = cibaGraph.compile();
