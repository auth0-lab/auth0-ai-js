/**
 * Auth0Interrupt is the base class for all interruptions
 * in the Auth0 AI sdk.
 *
 * It is serializable to a JSON object.
 */
export class Auth0Interrupt extends Error {
  name = "AUTH0_AI_INTERRUPT" as const;
  code: string;
  context: Record<string, any> | undefined;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }

  /**
   *
   * Serialize the interrupt to a JSON object.
   *
   * @returns - The JSON object representation of the interrupt.
   */
  toJSON() {
    return Object.fromEntries(
      Object.entries(this).filter(([key]) => key !== "stack")
    );
  }

  /**
   *
   * Extract the data type of the interrupt without the js Error properties.
   *
   * @returns The data type of the interrupt.
   */
  static DataType<T extends Auth0Interrupt>(): Omit<T, keyof Error> {
    return {} as Omit<T, keyof Error>;
  }

  /**
   *
   * Checks if an interrupt is of type Auth0Interrupt.
   *
   * @param interrupt - The interrupt to check.
   * @returns -
   */
  static isInterrupt(interrupt: any): interrupt is Auth0Interrupt {
    return interrupt && interrupt.name === "AUTH0_AI_INTERRUPT";
  }

  /**
   *
   * Checks if an interrupt is of a specific type  asserting its data component.
   *
   * This method will work even if the interruption is sent serialized to the front end.
   *
   * @param clazz - The class of the interrupt to check.
   * @param interrupt - The interrupt to check.
   *
   * @returns - True if the interrupt is of the specified type.
   */
  static is<T extends Auth0Interrupt>(
    clazz: { code: string } & (new (...args: any[]) => T),
    interrupt: any
  ): interrupt is Omit<T, keyof Error> {
    return interrupt && interrupt.code === clazz.code;
  }
}
