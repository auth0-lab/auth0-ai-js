export enum Auth0Nodes {
  AUTH0_CIBA_HITL = "AUTH0_CIBA_HITL",
  AUTH0_CIBA = "AUTH0_CIBA",
}

export enum Auth0Graphs {
  CIBA_POLLER = "AUTH0_CIBA_POLLER",
}

export enum HumanResponse {
  APPROVED = "approved",
  REJECTED = "rejected",
}

export type CibaResponse = {
  authReqId: string;
  expiresIn: number;
  interval: number;
};

export type { SchedulerParams } from "./ciba-graph/types";
