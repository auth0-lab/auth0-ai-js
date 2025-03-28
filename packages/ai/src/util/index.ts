export const omit = function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
};

export type RequireFields<T, K extends keyof T> = Required<Pick<T, K>> &
  Omit<T, K>;
