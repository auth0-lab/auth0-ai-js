import { Job, Worker } from "bullmq";

import { connection } from "../connection";
import { handlers } from "./handlers";

export const setupWorker = () => {
  const worker = new Worker(
    process.env.QUEUENAME as string,
    async (job: Job) => {
      await handlers[job.name as keyof typeof handlers](job);
    },
    {
      connection,
      removeOnComplete: { count: 0 },
      removeOnFail: { count: 0 },
    }
  );
  return worker;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    setupWorker();
  })();
}
