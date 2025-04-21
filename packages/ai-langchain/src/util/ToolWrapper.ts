export type ToolLike = {
  name: string;
  description: string;
  schema: any;
  invoke(input: any, config?: any): Promise<any>;
};

export type ToolWrapper = <ToolType extends ToolLike>(t: ToolType) => ToolType;
