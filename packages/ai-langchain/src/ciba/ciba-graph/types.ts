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
  toolId?: string;
  onResumeInvoke: string;
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
};

export interface ICIBAGraph<N extends string = string> {
  getTools(): ProtectedTool<N>[];
  getGraph(): StateGraph<N>;
  getAuthorizerParams(): AuthorizerParams | undefined;
  getOptions(): CIBAGraphOptions<N> | undefined;
}

export type CIBAGraphOptions<N extends string> = Omit<
  CIBAOptions<N>,
  "binding_message"
> & {
  config: {
    onResumeInvoke: string;
    scheduler: string | ((config: SchedulerParams) => Promise<void>);
  };
};

export type ProtectedTool<N extends string = string> = {
  toolName: string;
  options: CIBAOptions<N>;
};
