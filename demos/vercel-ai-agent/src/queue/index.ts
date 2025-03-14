import { Queue } from "bullmq";
import { addDays } from "date-fns";
import ms from "ms";
import { randomUUID } from "node:crypto";

import { ConditionalTrade } from "../ConditionalTrade";
import { connection } from "../connection";

function getRandomElement(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const queue = new Queue(process.env.QUEUENAME as string, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 60 * 30,
    },
    removeOnFail: {
      age: 60 * 15,
    },
  },
});

export const scheduleConditionalBuy = (conditionalTrade: ConditionalTrade) => {
  return queue.upsertJobScheduler(
    conditionalTrade.tradeID,
    {
      every: ms("15s"),
      endDate: addDays(new Date(), 1),
    },
    {
      name: "CONDITIONAL_TRADE",
      data: conditionalTrade,
      opts: {
        attempts: 100,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
      },
    }
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const id = randomUUID();

    await scheduleConditionalBuy({
      ticker: getRandomElement(["ZEKO", "ATKO"]),
      qty: Math.floor(Math.random() * 100),

      tradeID: id,

      userID: process.env.TEST_USER_ID as string,
      email: process.env.TEST_USER_EMAIL as string,

      condition: {
        metric: "PE",
        threshold: 15,
        operator: ">",
      },
    });
    process.exit(0);
  })();
}
