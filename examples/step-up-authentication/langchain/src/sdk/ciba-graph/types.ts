import { AuthorizerParams, CibaAuthorizerOptions } from "@auth0/ai";
import { StateGraph } from "@langchain/langgraph";
import { AIMessage, ToolMessage } from "@langchain/langgraph-sdk";

export interface State {
  messages: (AIMessage | ToolMessage)[];
  auth0?: {
    error?: string;
  };
}

export type SchedulerParams = {
  userId: string;
  threadId: string;
  onResumeCall: string;
  cibaGraphId: string;
  cibaResponse: {
    auth_req_id: string;
    expires_in: number;
    interval: number;
  };
};

export type CIBAOptions<N extends string> = Omit<
  CibaAuthorizerOptions,
  "userId" | "scope"
> & {
  scope?: string;
  onApproveGoTo?: N;
  onRejectGoTo?: N;

  authorizerConfig?: AuthorizerParams;
};

export interface ICIBAGraph<N extends string = string> {
  getTools(): ProtectedTool<N>[];
  getGraph(): StateGraph<N>;
  getOptions(): CIBAGraphOptions<N> | undefined;
}

export type CIBAGraphOptions<N extends string> = {
  ciba?: Omit<CIBAOptions<N>, "binding_message"> & {
    onResumeCall: string;
    scheduler: string | ((config: SchedulerParams) => Promise<void>);
  };
};

export type ProtectedTool<N extends string = string> = {
  toolName: string;
  options: CIBAOptions<N>;
};
