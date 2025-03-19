export function SchedulerClient(url?: string) {
  return {
    schedule: async (graphId: string, data: any) => {
      try {
        // TODO: add authentication
        await fetch(url || `http://localhost:5555/schedule/${graphId}`, {
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
        await fetch(url || `http://localhost:5555/schedule/${taskId}`, {
          method: "DELETE",
        });
      } catch (e) {
        console.log(e);
      }
    },
  };
}
