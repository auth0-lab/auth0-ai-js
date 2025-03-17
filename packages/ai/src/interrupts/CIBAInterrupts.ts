import { Auth0Interrupt } from "./Auth0Interrupt";

export class CIBAInterrupt extends Auth0Interrupt {
  constructor(message: string, code: string) {
    super(message, `CIBA_${code}`);
  }
}

export class AccessDeniedError extends CIBAInterrupt {
  constructor(message: string) {
    super(message, "ACCESS_DENIED");
  }
}

export class UserDoesNotHavePushNotificationsError extends CIBAInterrupt {
  constructor(message: string) {
    super(message, "USER_DOES_NOT_HAVE_PUSH_NOTIFICATIONS");
  }
}

export class AuthorizationRequestExpiredError extends CIBAInterrupt {
  constructor(message: string) {
    super(message, "AUTHORIZATION_REQUEST_EXPIRED");
  }
}

export class AuthorizationPending extends CIBAInterrupt {
  constructor(message: string) {
    super(message, "AUTHORIZATION_PENDING");
  }
}

export class AuthorizationRequired extends Auth0Interrupt {
  constructor(message: string) {
    super(message, "AUTHORIZATION_REQUIRED");
  }
}

export class AuthorizationPollingError extends Auth0Interrupt {
  constructor(message: string) {
    super(message, "AUTHORIZATION_POLLING_ERROR");
  }
}
