import { Auth0Interrupt, Auth0InterruptData } from "./Auth0Interrupt";

export class CIBAInterrupt extends Auth0Interrupt {
  constructor(message: string, code: string) {
    super(message, code);
  }

  static isInterrupt<T extends abstract new (...args: any) => any>(
    this: T,
    interrupt: any
  ): interrupt is Auth0InterruptData<InstanceType<T>> {
    return (
      Auth0Interrupt.isInterrupt(interrupt) &&
      interrupt.code.startsWith("CIBA_")
    );
  }
}

export class AccessDeniedInterrupt extends CIBAInterrupt {
  public static code: string = "CIBA_ACCESS_DENIED" as const;
  constructor(message: string) {
    super(message, AccessDeniedInterrupt.code);
  }
}

export class UserDoesNotHavePushNotificationsInterrupt extends CIBAInterrupt {
  public static code: string =
    "CIBA_USER_DOES_NOT_HAVE_PUSH_NOTIFICATIONS" as const;
  constructor(message: string) {
    super(message, UserDoesNotHavePushNotificationsInterrupt.code);
  }
}

export class AuthorizationRequestExpiredInterrupt extends CIBAInterrupt {
  public static code: string = "CIBA_AUTHORIZATION_REQUEST_EXPIRED" as const;
  constructor(message: string) {
    super(message, AuthorizationRequestExpiredInterrupt.code);
  }
}

export class AuthorizationPendingInterrupt extends CIBAInterrupt {
  public static code: string = "CIBA_AUTHORIZATION_PENDING" as const;
  constructor(message: string) {
    super(message, AuthorizationPendingInterrupt.code);
  }
}

export class AuthorizationRequiredInterrupt extends Auth0Interrupt {
  public static code: string = "CIBA_AUTHORIZATION_REQUIRED" as const;
  constructor(message: string) {
    super(message, AuthorizationRequiredInterrupt.code);
  }
}

export class AuthorizationPollingInterrupt extends Auth0Interrupt {
  public static code: string = "CIBA_AUTHORIZATION_POLLING_ERROR" as const;
  constructor(message: string) {
    super(message, AuthorizationPollingInterrupt.code);
  }
}
