import { CibaPollerGraph } from "../sdk/ciba-poller-graph";
import { SchedulerClient } from "../services/client";

const cibaGraph = CibaPollerGraph({
  onStopScheduler: async (state) => {
    // Custom scheduler
    await SchedulerClient().stop(state.taskId);
  },
});

export const graph = cibaGraph.compile();
