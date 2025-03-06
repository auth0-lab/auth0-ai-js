export type { conditionalTrade } from "./conditional_trade";

import { Job } from "bullmq";

import { conditionalTrade } from "./conditional_trade";

export type JobType = "CONDITIONAL_TRADE";

export const handlers: Record<JobType, (job: Job<any>) => Promise<any>> = {
  CONDITIONAL_TRADE: conditionalTrade,
};
