export { getAuthorizer } from "./get-authorizer";
export { runAuthorizer } from "./run-authorizer";

export type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

export type ReturnTypeOf<T> = T extends (...args: any[]) => infer R
  ? Awaited<R>
  : never;

export async function bindingMessage(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<string> {
  return strings.reduce((result, str, i) => {
    const value = values[i] !== undefined ? values[i] : "";
    return `${result}${str}${value}`;
  }, "");
}
