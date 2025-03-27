// Define a type alias for the generalized type
export type Auth0InterruptData<T extends Auth0Interrupt> = Omit<
  Omit<T, keyof Error>,
  "toJSON"
> & { message: string };

export const InterruptName = "AUTH0_AI_INTERRUPT" as const;

/**
 * Auth0Interrupt is the base class for all interruptions
 * in the Auth0 AI sdk.
 *
 * It is serializable to a JSON object.
 */
export class Auth0Interrupt extends Error {
  name = InterruptName;
  code: string;

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
  toJSON(): Auth0InterruptData<this> {
    return {
      ...Object.fromEntries(
        Object.entries(this).filter(
          ([key]) => key !== "stack" && key !== "toJSON"
        )
      ),
      message: this.message,
    } as Auth0InterruptData<this>;
  }

  /**
   *
   * Checks if an interrupt is of a specific type asserting its data component.
   *
   * This method assert the data part of the interrupt.
   *
   * @param clazz - The class of the interrupt to check.
   * @param interrupt - The interrupt to check.
   *
   * @returns - True if the interrupt is of the specified type.
   */
  static isInterrupt<T extends abstract new (...args: any) => any>(
    this: T & { code?: string },
    interrupt: any
  ): interrupt is Auth0InterruptData<InstanceType<T>> {
    return (
      interrupt &&
      interrupt.name === "AUTH0_AI_INTERRUPT" &&
      (typeof this.code === "undefined" || interrupt.code === this.code)
    );
  }
}
