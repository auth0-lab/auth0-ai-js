import { DeviceAuthorizationResponse } from "../authorizers/device-authorizer/DeviceAuthResponse";
import { Auth0Interrupt, Auth0InterruptData } from "./Auth0Interrupt";

export interface WithDeviceAuthResponseData {
  response: DeviceAuthorizationResponse;
}

/**
 * Base class for Device interrupts.
 */
export class DeviceInterrupt extends Auth0Interrupt {
  constructor(message: string, code: string) {
    super(message, code);
  }

  static isInterrupt<T extends abstract new (...args: any) => any>(
    this: T,
    interrupt: any
  ): interrupt is Auth0InterruptData<InstanceType<T>> {
    return (
      interrupt &&
      Auth0Interrupt.isInterrupt(interrupt) &&
      typeof interrupt.code === "string" &&
      interrupt.code.startsWith("DEVICE_")
    );
  }

  static hasRequestData(
    interrupt: any
  ): interrupt is WithDeviceAuthResponseData {
    return DeviceInterrupt.isInterrupt(interrupt) && "response" in interrupt;
  }
}

/**
 * An interrupt that is thrown when the user denies the authorization request.
 */
export class AccessDeniedInterrupt
  extends DeviceInterrupt
  implements WithDeviceAuthResponseData
{
  public static code: string = "DEVICE_ACCESS_DENIED" as const;
  constructor(
    message: string,
    public readonly response: DeviceAuthorizationResponse
  ) {
    super(message, AccessDeniedInterrupt.code);
  }
}

/**
 * An interrupt that is thrown when the authorization request has expired.
 */
export class AuthorizationRequestExpiredInterrupt
  extends DeviceInterrupt
  implements WithDeviceAuthResponseData
{
  public static code: string = "DEVICE_AUTHORIZATION_REQUEST_EXPIRED" as const;
  constructor(
    message: string,
    public readonly response: DeviceAuthorizationResponse
  ) {
    super(message, AuthorizationRequestExpiredInterrupt.code);
  }
}

/**
 * An interrupt that is thrown when the authorization is still pending
 * and the Authorizer is in `mode: interrupt`.
 */
export class AuthorizationPendingInterrupt
  extends DeviceInterrupt
  implements WithDeviceAuthResponseData
{
  public static code: string = "DEVICE_AUTHORIZATION_PENDING" as const;
  constructor(
    message: string,
    public readonly response: DeviceAuthorizationResponse
  ) {
    super(message, AuthorizationPendingInterrupt.code);
  }
}

/**
 * An interrupt that is thrown when the authorization polling fails.
 */
export class AuthorizationPollingInterrupt
  extends Auth0Interrupt
  implements WithDeviceAuthResponseData
{
  public static code: string = "DEVICE_AUTHORIZATION_POLLING_ERROR" as const;
  constructor(
    message: string,
    public readonly response: DeviceAuthorizationResponse
  ) {
    super(message, AuthorizationPollingInterrupt.code);
  }
}

/**
 * An interrupt that is thrown when the grant is invalid.
 */
export class InvalidGrantInterrupt
  extends Auth0Interrupt
  implements WithDeviceAuthResponseData
{
  public static code: string = "DEVICE_INVALID_GRANT" as const;
  constructor(
    message: string,
    public readonly response: DeviceAuthorizationResponse
  ) {
    super(message, AuthorizationPollingInterrupt.code);
  }
}
