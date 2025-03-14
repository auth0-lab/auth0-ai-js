export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = AccessDeniedError.name;
  }
}

export class UserDoesNotHavePushNotificationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = UserDoesNotHavePushNotificationsError.name;
  }
}

export class AuthorizationRequestExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = AuthorizationRequestExpiredError.name;
  }
}

export class AuthorizationPending extends Error {
  constructor(message: string) {
    super(message);
    this.name = AuthorizationPending.name;
  }
}

export class AuthorizationRequired extends Error {
  constructor(message: string) {
    super(message);
    this.name = AuthorizationRequired.name;
  }
}

export class AuthorizationPollingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = AuthorizationPollingError.name;
  }
}
