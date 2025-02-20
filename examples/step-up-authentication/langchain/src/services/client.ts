import { SchedulerParams } from "../sdk/types";

export function SchedulerClient(url?: string) {
  return {
    schedule: async (data: SchedulerParams) => {
      try {
        // TODO: add authentication
        fetch(url || "http://localhost:5555/schedule", {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (e) {
        console.log(e);
      }
    },
    stop: async (taskId: string) => {
      try {
        // TODO: add authentication
        fetch(url || `http://localhost:5555/schedule/${taskId}`, {
          method: "DELETE",
        });
      } catch (e) {
        console.log(e);
      }
    },
  };
}
