export { getAuthorizer } from "./get-authorizer";
export { runAuthorizer } from "./run-authorizer";

export type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

export type ReturnTypeOf<T> = T extends (...args: any[]) => infer R
  ? Awaited<R>
  : never;
