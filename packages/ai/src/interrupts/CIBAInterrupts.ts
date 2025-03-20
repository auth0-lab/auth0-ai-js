import { CIBAAuthorizationRequest } from "../authorizers/ciba/CIBAAuthorizationRequest";
import { Auth0Interrupt, Auth0InterruptData } from "./Auth0Interrupt";

export interface WithRequestData {
  request: CIBAAuthorizationRequest;
}

/**
 * Base class for CIBA interrupts.
 */
export class CIBAInterrupt extends Auth0Interrupt {
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
      interrupt.code.startsWith("CIBA_")
    );
  }

  static hasRequestData(interrupt: any): interrupt is WithRequestData {
    return CIBAInterrupt.isInterrupt(interrupt) && "request" in interrupt;
  }
}

/**
 * An interrupt that is thrown when the user denies the authorization request.
 */
export class AccessDeniedInterrupt
  extends CIBAInterrupt
  implements WithRequestData
{
  public static code: string = "CIBA_ACCESS_DENIED" as const;
  constructor(
    message: string,
    public readonly request: CIBAAuthorizationRequest
  ) {
    super(message, AccessDeniedInterrupt.code);
  }
}

/**
 * An interrupt that is thrown when the user does not have push notifications enabled.
 */
export class UserDoesNotHavePushNotificationsInterrupt extends CIBAInterrupt {
  public static code: string =
    "CIBA_USER_DOES_NOT_HAVE_PUSH_NOTIFICATIONS" as const;
  constructor(message: string) {
    super(message, UserDoesNotHavePushNotificationsInterrupt.code);
  }
}

/**
 * An interrupt that is thrown when the authorization request has expired.
 */
export class AuthorizationRequestExpiredInterrupt
  extends CIBAInterrupt
  implements WithRequestData
{
  public static code: string = "CIBA_AUTHORIZATION_REQUEST_EXPIRED" as const;
  constructor(
    message: string,
    public readonly request: CIBAAuthorizationRequest
  ) {
    super(message, AuthorizationRequestExpiredInterrupt.code);
  }
}

/**
 * An interrupt that is thrown when the authorization is still pending
 * and the Authorizer is in `mode: interrupt`.
 */
export class AuthorizationPendingInterrupt
  extends CIBAInterrupt
  implements WithRequestData
{
  public static code: string = "CIBA_AUTHORIZATION_PENDING" as const;
  constructor(
    message: string,
    public readonly request: CIBAAuthorizationRequest
  ) {
    super(message, AuthorizationPendingInterrupt.code);
  }
}

/**
 * An interrupt that is thrown when the authorization polling fails.
 */
export class AuthorizationPollingInterrupt
  extends Auth0Interrupt
  implements WithRequestData
{
  public static code: string = "CIBA_AUTHORIZATION_POLLING_ERROR" as const;
  constructor(
    message: string,
    public readonly request: CIBAAuthorizationRequest
  ) {
    super(message, AuthorizationPollingInterrupt.code);
  }
}

/**
 * An interrupt that is thrown when the authorization polling fails.
 */
export class InvalidGrantInterrupt
  extends Auth0Interrupt
  implements WithRequestData
{
  public static code: string = "CIBA_INVALID_GRANT" as const;
  constructor(
    message: string,
    public readonly request: CIBAAuthorizationRequest
  ) {
    super(message, AuthorizationPollingInterrupt.code);
  }
}
