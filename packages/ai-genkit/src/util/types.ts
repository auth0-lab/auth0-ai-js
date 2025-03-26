import type { ToolFn } from "@genkit-ai/ai/tool";
import { z } from "genkit";

export type ToolWrapper = <
  INPUT extends z.AnyZodObject = any,
  OUTPUT extends z.AnyZodObject = any,
  T extends ToolFn<INPUT, OUTPUT> = ToolFn<INPUT, OUTPUT>,
>(
  t: T
) => T;
