// export type ZodObjectAny = z.ZodObject<any, any, any, any>;

export type ToolLike<TSchema, TInput, TConfig, TReturnType> = {
  name: string;
  description: string;
  schema: TSchema;
  invoke(input: TInput, config?: TConfig): Promise<TReturnType>;
};

export type ToolWrapper = <
  TSchema,
  TInput,
  TConfig,
  TReturnType,
  ToolType extends ToolLike<TSchema, TInput, TConfig, TReturnType>,
>(
  t: ToolType
) => ToolType;
