import z from "zod";

import { FGAAuthorizerBase } from "@auth0/ai/FGA";

export type GenKitToolHandler<
  I extends z.ZodTypeAny,
  O extends z.ZodTypeAny
> = (input: z.infer<I>) => Promise<z.infer<O>>;

/**
 * The FGAAuthorizer class implements the FGA authorization control for a Genkit AI tool.
 *
 * This class extends the FGAAuthorizerBase and provides a method to build a tool authorizer
 * that protects the tool execution using FGA.
 *
 */
export class FGAAuthorizer extends FGAAuthorizerBase<[any, any]> {
  /**
   *
   * Builds a tool authorizer that protects the tool execution with FGA.
   *
   * @returns A tool authorizer.
   */
  authorizer() {
    return <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
      t: GenKitToolHandler<I, O>
    ): GenKitToolHandler<I, O> => {
      return this.protect(t) as GenKitToolHandler<I, O>;
    };
  }
}
